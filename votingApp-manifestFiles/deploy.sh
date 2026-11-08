#!/bin/bash

set -Eeuo pipefail

# ==========================================================
# CONFIGURATION
# ==========================================================

NAMESPACE="voting-app-ns"
STATEFULSET="mongo-st-set"
MONGO_PODS=("mongo-st-set-0" "mongo-st-set-1" "mongo-st-set-2")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log() {
    echo
    echo "=================================================="
    echo " $1"
    echo "=================================================="
}

error_handler() {
    echo
    echo "ERROR: Script failed at line $1"
    exit 1
}

trap 'error_handler $LINENO' ERR

# ==========================================================
# STEP 1: PREPARE K3S CLUSTER
# ==========================================================

log "Preparing K3s cluster"

if ! command -v curl >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y curl
fi

if ! command -v k3s >/dev/null 2>&1; then

    log "Installing K3s server"

    sudo mkdir -p /etc/rancher/k3s

    sudo tee /etc/rancher/k3s/config.yaml >/dev/null <<'EOF'
disable:
  - traefik
write-kubeconfig-mode: "644"
EOF

    curl -sfL https://get.k3s.io | \
        INSTALL_K3S_EXEC="server" sh -

else
    echo "K3s is already installed. Skipping installation."
fi

# ==========================================================
# STEP 2: CONFIGURE KUBECTL
# ==========================================================

log "Configuring kubeconfig"

mkdir -p "$HOME/.kube"

sudo cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"

sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"

chmod 600 "$HOME/.kube/config"

export KUBECONFIG="$HOME/.kube/config"

# Avoid duplicate entries in .bashrc

if ! grep -Fxq 'export KUBECONFIG=$HOME/.kube/config' "$HOME/.bashrc" 2>/dev/null; then
    echo 'export KUBECONFIG=$HOME/.kube/config' >> "$HOME/.bashrc"
fi

# ==========================================================
# STEP 3: WAIT FOR K3S NODE
# ==========================================================

log "Waiting for Kubernetes node readiness"

kubectl wait \
    --for=condition=Ready \
    nodes --all \
    --timeout=180s

kubectl get nodes -o wide

# ==========================================================
# STEP 4: INSTALL HELM
# ==========================================================

log "Installing Helm"

if ! command -v helm >/dev/null 2>&1; then

    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

else
    echo "Helm is already installed. Skipping installation."
fi

helm version

# ==========================================================
# STEP 5: CREATE MONGODB STORAGE DIRECTORIES
# ==========================================================

log "Creating MongoDB directories"

sudo mkdir -p /mnt/mongodb/mongo-0
sudo mkdir -p /mnt/mongodb/mongo-1
sudo mkdir -p /mnt/mongodb/mongo-2

# ==========================================================
# STEP 6: CREATE PERSISTENT VOLUMES
# ==========================================================

log "Applying Persistent Volumes"

kubectl apply -f pv.yml

# ==========================================================
# STEP 7: CREATE NAMESPACE
# ==========================================================

log "Creating namespace"

kubectl create namespace "$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

# ==========================================================
# STEP 8: APPLY MONGODB SECRET AND SERVICE FIRST
# ==========================================================

log "Applying MongoDB Secret and Headless Service"

kubectl apply \
    -f mongo-secret.yml \
    -f mongo-svc.yml \
    -n "$NAMESPACE"

# ==========================================================
# STEP 9: DEPLOY MONGODB STATEFULSET
# ==========================================================

log "Deploying MongoDB StatefulSet"

kubectl apply -f mongo-st-set.yml -n "$NAMESPACE"

# ==========================================================
# STEP 10: WAIT FOR ALL MONGODB PODS
# ==========================================================

log "Waiting for MongoDB pods"

for pod in "${MONGO_PODS[@]}"
do
    echo "Waiting for $pod..."

    kubectl wait \
        --for=condition=Ready \
        "pod/$pod" \
        -n "$NAMESPACE" \
        --timeout=300s
done

echo "All MongoDB pods are Ready."

kubectl get pods -n "$NAMESPACE" -o wide

# ==========================================================
# STEP 11: INITIALIZE REPLICA SET IF REQUIRED
# ==========================================================

log "Checking MongoDB replica set"

RS_STATUS=$(kubectl exec -n "$NAMESPACE" mongo-st-set-0 -- \
    mongo --quiet --eval '
    try {
        rs.status();
        print("INITIALIZED");
    } catch(e) {
        if (e.code === 94 || e.codeName === "NotYetInitialized") {
            print("NOT_INITIALIZED");
        } else {
            printjson(e);
            quit(1);
        }
    }
')

if echo "$RS_STATUS" | grep -qx "NOT_INITIALIZED"; then

    echo "Replica set is not initialized. Initializing now."

    kubectl exec -n "$NAMESPACE" mongo-st-set-0 -- \
        mongo --quiet --eval '
        rs.initiate({
            _id: "rs0",
            members: [
                {_id: 0, host: "mongo-st-set-0.mongo-svc:27017"},
                {_id: 1, host: "mongo-st-set-1.mongo-svc:27017"},
                {_id: 2, host: "mongo-st-set-2.mongo-svc:27017"}
            ]
        });
    '

else
    echo "Replica set is already initialized."
fi

# ==========================================================
# STEP 12: DISCOVER ACTUAL PRIMARY
# ==========================================================

log "Waiting for MongoDB PRIMARY election"

PRIMARY_POD=""

for attempt in $(seq 1 60)
do

    for pod in "${MONGO_PODS[@]}"
    do

        STATUS=$(kubectl exec -n "$NAMESPACE" "$pod" -- \
            mongo --quiet --eval '
            print(db.isMaster().ismaster ? "PRIMARY" : "SECONDARY");
            ' 2>/dev/null || true)

        if echo "$STATUS" | grep -qx "PRIMARY"; then
            PRIMARY_POD="$pod"
            break 2
        fi

    done

    echo "No PRIMARY detected yet. Attempt $attempt/60"

    sleep 5

done

if [[ -z "$PRIMARY_POD" ]]; then
    echo "ERROR: MongoDB PRIMARY election timed out."

    for pod in "${MONGO_PODS[@]}"
    do
        echo "Replica status from $pod:"
        kubectl exec -n "$NAMESPACE" "$pod" -- \
            mongo --quiet --eval 'rs.status()' || true
    done

    exit 1
fi

echo "MongoDB PRIMARY detected: $PRIMARY_POD"

# ==========================================================
# STEP 13: INITIALIZE DATABASE RECORDS
# ==========================================================

log "Initializing MongoDB database"

kubectl exec -i -n "$NAMESPACE" "$PRIMARY_POD" -- \
    mongo --quiet <<'EOF'

use langdb;

db.languages.update(
    {name: "csharp"},
    {$setOnInsert: {
        name: "csharp",
        codedetail: {
            usecase: "system, web, server-side",
            rank: 5,
            compiled: false,
            homepage: "https://dotnet.microsoft.com/learn/csharp",
            download: "https://dotnet.microsoft.com/download/",
            votes: 0
        }
    }},
    {upsert: true}
);

db.languages.update(
    {name: "python"},
    {$setOnInsert: {
        name: "python",
        codedetail: {
            usecase: "system, web, server-side",
            rank: 3,
            script: false,
            homepage: "https://www.python.org/",
            download: "https://www.python.org/downloads/",
            votes: 0
        }
    }},
    {upsert: true}
);

db.languages.update(
    {name: "javascript"},
    {$setOnInsert: {
        name: "javascript",
        codedetail: {
            usecase: "web, client-side",
            rank: 7,
            script: false,
            homepage: "https://en.wikipedia.org/wiki/JavaScript",
            download: "n/a",
            votes: 0
        }
    }},
    {upsert: true}
);

db.languages.update(
    {name: "go"},
    {$setOnInsert: {
        name: "go",
        codedetail: {
            usecase: "system, web, server-side",
            rank: 12,
            compiled: true,
            homepage: "https://golang.org",
            download: "https://golang.org/dl/",
            votes: 0
        }
    }},
    {upsert: true}
);

db.languages.update(
    {name: "java"},
    {$setOnInsert: {
        name: "java",
        codedetail: {
            usecase: "system, web, server-side",
            rank: 1,
            compiled: true,
            homepage: "https://www.java.com/en/",
            download: "https://www.java.com/en/download/",
            votes: 0
        }
    }},
    {upsert: true}
);

db.languages.update(
    {name: "nodejs"},
    {$setOnInsert: {
        name: "nodejs",
        codedetail: {
            usecase: "system, web, server-side",
            rank: 20,
            script: false,
            homepage: "https://nodejs.org/en/",
            download: "https://nodejs.org/en/download/",
            votes: 0
        }
    }},
    {upsert: true}
);

print("Database records:");

db.languages.find().pretty();

EOF

# ==========================================================
# STEP 14: DEPLOY API
# ==========================================================

log "Deploying API"

kubectl apply \
    -f api-dep.yml \
    -f api-svc.yml \
    -n "$NAMESPACE"

# ==========================================================
# STEP 15: DEPLOY FRONTEND
# ==========================================================

log "Deploying Frontend"

kubectl apply \
	-f frontend-configmap.yml \
    -f frontend-dep.yml \
    -f frontend-svc.yml \
    -n "$NAMESPACE"

# ==========================================================
# STEP 16: WAIT FOR APPLICATION DEPLOYMENTS
# ==========================================================

log "Waiting for application rollouts"

while IFS= read -r deployment
do
    kubectl rollout status "$deployment" \
        -n "$NAMESPACE" \
        --timeout=300s
done < <(kubectl get deployments -n "$NAMESPACE" -o name)

# ==========================================================
# STEP 17: DEPLOYMENT SUMMARY
# ==========================================================

log "DEPLOYMENT COMPLETED SUCCESSFULLY"

echo
echo "MongoDB PRIMARY: $PRIMARY_POD"
echo "Namespace: $NAMESPACE"

echo
kubectl get pods -n "$NAMESPACE"

echo
kubectl get svc -n "$NAMESPACE"

echo
kubectl get pvc -n "$NAMESPACE"

echo
echo "Deployment completed successfully!"
