
#!/bin/bash

set -Eeuo pipefail

# ==========================================================
# CONFIGURATION
# ==========================================================

NAMESPACE="voting-app-ns"
STATEFULSET="mongo-st-set"
MONGO_POD="mongo-st-set-0"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ==========================================================
# FUNCTIONS
# ==========================================================

log() {
    echo
    echo "=================================================="
    echo " $1"
    echo "=================================================="
}

error_handler() {
    echo
    echo "ERROR: Deployment failed at line $1."
    exit 1
}

trap 'error_handler $LINENO' ERR

# ==========================================================
# Cluster: K3S & HELM INSTALATION 
# ==========================================================
sudo apt-get update
sudo apt-get install -y curl

curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server --disable traefik --write-kubeconfig-mode 644" sh -

mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
chmod 600 ~/.kube/config
export KUBECONFIG=~/.kube/config
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc

curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

echo "Waiting..."
sleep 20
echo "Done!"



# ==========================================================
# STEP 1: CREATE MONGODB STORAGE DIRECTORIES
# ==========================================================

log "Creating MongoDB storage directories"

sudo mkdir -p /mnt/mongodb/mongo-0
sudo mkdir -p /mnt/mongodb/mongo-1
sudo mkdir -p /mnt/mongodb/mongo-2

# ==========================================================
# STEP 2: CREATE PERSISTENT VOLUMES
# ==========================================================

log "Applying Persistent Volumes"

kubectl apply -f pv.yml

# ==========================================================
# STEP 3: CREATE NAMESPACE
# ==========================================================

log "Creating Kubernetes namespace"

kubectl create namespace "$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

# ==========================================================
# STEP 4: DEPLOY MONGODB STATEFULSET
# ==========================================================

log "Deploying MongoDB StatefulSet"

kubectl apply -f mongo-st-set.yml -n "$NAMESPACE"

log "Waiting for MongoDB StatefulSet pods"

kubectl rollout status statefulset/"$STATEFULSET" \
    -n "$NAMESPACE" \
    --timeout=600s

# ==========================================================
# STEP 5: APPLY MONGODB CONFIGURATION
# ==========================================================

log "Applying MongoDB Secret and Service"

kubectl apply -f mongo-secret.yml -f mongo-svc.yml \
    -n "$NAMESPACE"

# ==========================================================
# STEP 6: WAIT FOR MONGODB PODS
# ==========================================================

log "Waiting for MongoDB pods to become ready"

for pod in mongo-st-set-0 mongo-st-set-1 mongo-st-set-2
do
    kubectl wait \
        --for=condition=Ready \
        pod/"$pod" \
        -n "$NAMESPACE" \
        --timeout=300s
done

# ==========================================================
# STEP 7: INITIALIZE MONGODB REPLICA SET
# ==========================================================

log "Checking MongoDB Replica Set"

kubectl exec -i -n "$NAMESPACE" "$MONGO_POD" -- mongo --quiet <<'EOF'
try {
    rs.status();
    print("Replica set is already initialized.");
} catch (e) {
    if (e.code === 94 || e.codeName === "NotYetInitialized") {
        print("Initializing MongoDB replica set...");

        rs.initiate({
            _id: "rs0",
            members: [
                {_id: 0, host: "mongo-st-set-0.mongo-svc:27017"},
                {_id: 1, host: "mongo-st-set-1.mongo-svc:27017"},
                {_id: 2, host: "mongo-st-set-2.mongo-svc:27017"}
            ]
        });
    } else {
        throw e;
    }
}
EOF

# ==========================================================
# STEP 8: WAIT FOR MONGODB PRIMARY
# ==========================================================

log "Waiting for MongoDB PRIMARY election"

PRIMARY_READY=false

for attempt in $(seq 1 60)
do
    if kubectl exec -n "$NAMESPACE" "$MONGO_POD" -- \
        mongo --quiet --eval 'db.isMaster().ismaster' 2>/dev/null \
        | grep -q "true"; then

        PRIMARY_READY=true
        break
    fi

    echo "Waiting for PRIMARY... ($attempt/60)"
    sleep 5
done

if [ "$PRIMARY_READY" != "true" ]; then
    echo "MongoDB PRIMARY election timed out."
    exit 1
fi

echo "MongoDB PRIMARY is ready."

# ==========================================================
# STEP 9: INSERT INITIAL DATABASE RECORDS
# ==========================================================

log "Initializing MongoDB database"

kubectl exec -i -n "$NAMESPACE" "$MONGO_POD" -- mongo --quiet <<'EOF'

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

print("Current language records:");

db.languages.find().pretty();

EOF

# ==========================================================
# STEP 10: DEPLOY API
# ==========================================================

log "Deploying API"

kubectl apply -f api-dep.yml -f api-svc.yml \
    -n "$NAMESPACE"

# ==========================================================
# STEP 11: DEPLOY FRONTEND
# ==========================================================

log "Deploying Frontend"

kubectl apply -f frontend-dep.yml -f frontend-svc.yml \
    -n "$NAMESPACE"

# ==========================================================
# STEP 12: WAIT FOR APPLICATION DEPLOYMENTS
# ==========================================================

log "Waiting for API and Frontend deployments"

kubectl rollout status deployment \
    -n "$NAMESPACE" \
    --timeout=300s

# ==========================================================
# STEP 13: DEPLOYMENT SUMMARY
# ==========================================================

log "DEPLOYMENT COMPLETED SUCCESSFULLY"

echo
echo "Namespace: $NAMESPACE"
echo

kubectl get pods -n "$NAMESPACE"
echo

kubectl get svc -n "$NAMESPACE"
echo

kubectl get pvc -n "$NAMESPACE"

echo
echo "All resources have been applied successfully."

