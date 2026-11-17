# Amazon EKS Add-ons: Installation and IAM Configuration

This guide explains how to install and manage Amazon EKS add-ons,
including the Amazon EBS CSI Driver. It also explains why some add-ons
need an IAM role and ServiceAccount, while others can be installed
directly without a separate IAM role.

## Simple Guide

1.  Create your EKS cluster.
2.  Check which add-ons are already installed.
3.  Check whether the add-on requires AWS IAM permissions.
4.  If IAM permissions are required, create an IAM role and configure
    the add-on's identity.
5.  Install the add-on through the EKS Add-ons feature.
6.  Verify the add-on status and its Kubernetes resources.

> **Important:** Creating a Kubernetes ServiceAccount does not install
> an add-on. The ServiceAccount provides an identity to a pod. The
> add-on is the actual software installed into the cluster.

------------------------------------------------------------------------

## 1. Understand the Two Types of Add-ons

### Type 1: Add-ons that require AWS IAM permissions

Some add-ons need to call AWS APIs outside the Kubernetes cluster. For
example, the EBS CSI Driver needs permission to create, attach, detach,
and manage EBS volumes.

  -------------------------------------------------------------------------
  Add-on                  Kubernetes ServiceAccount IAM permissions
  ----------------------- ------------------------- -----------------------
  Amazon EBS CSI Driver   `ebs-csi-controller-sa`   Required

  Amazon VPC CNI          `aws-node`                Required for AWS
                                                    networking API
                                                    operations
  -------------------------------------------------------------------------

For these add-ons, configure an IAM role using a supported method:

-   **EKS Pod Identity** (AWS's recommended approach for supported
    add-ons).
-   **IRSA (IAM Roles for Service Accounts)**, using the cluster's OIDC
    provider.

This guide uses **IRSA** for the EBS CSI Driver because the trust policy
below is an IRSA trust policy.

### Type 2: Add-ons that do not require AWS IAM permissions

Some add-ons work inside the Kubernetes cluster and do not need to call
AWS APIs.

  Add-on       Add-on name    Separate IAM role required?
  ------------ -------------- -----------------------------
  CoreDNS      `coredns`      No
  kube-proxy   `kube-proxy`   No

You can install these through EKS without creating a separate IAM role
or configuring an IAM role annotation.

They still create Kubernetes resources, such as Deployments, DaemonSets,
pods, and ConfigMaps. **No separate IAM role does not mean no Kubernetes
resources are created.**

> Requirements can vary by add-on version, cluster configuration, and
> compute mode. Always check the requirements for the exact add-on you
> plan to install.

------------------------------------------------------------------------

## 2. Amazon EBS CSI Driver

The Amazon EBS CSI Driver allows Kubernetes workloads to use Amazon EBS
volumes as persistent storage.

For example, when a workload requests storage through a
PersistentVolumeClaim (PVC), the EBS CSI Driver can communicate with AWS
to provision and attach an EBS volume.

### Step 1: Create an IAM role

Create an IAM role with this name:

`AmazonEKS_EBS_CSI_DriverRole`

Choose **Web Identity** as the trusted entity and select your EKS
cluster's OIDC provider.

### Step 2: Configure the Trust Policy

Attach this trust policy to the IAM role. Replace `<AWS_ACCOUNT_ID>` and
`<OIDC_ID>` with your actual values.

``` json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/<OIDC_ID>"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/<OIDC_ID>:aud": "sts.amazonaws.com",
          "oidc.eks.us-east-1.amazonaws.com/id/<OIDC_ID>:sub": "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }
  ]
}
```

The `sub` condition restricts this role to:

`system:serviceaccount:kube-system:ebs-csi-controller-sa`

This ensures that only the intended ServiceAccount can assume this role
through the configured OIDC provider.

### Step 3: Attach the IAM Permission Policy

Attach the AWS-managed policy:

**AmazonEBSCSIDriverPolicy**

[View AmazonEBSCSIDriverPolicy in
IAM](https://us-east-1.console.aws.amazon.com/iam/home?region=us-east-1#/policies/details/arn%3Aaws%3Aiam%3A%3Aaws%3Apolicy%2Fservice-role%2FAmazonEBSCSIDriverPolicy)

**Policy note:** AWS also documents newer alternatives, including
`AmazonEBSCSIDriverPolicyV2` and
`AmazonEBSCSIDriverEKSClusterScopedPolicy`. Review the current AWS EBS
CSI Driver documentation and select the policy appropriate for your
security requirements before production use.

### Step 4: Install the EBS CSI Driver add-on

You do not need to manually apply the ServiceAccount YAML when
installing the AWS-managed add-on with `--service-account-role-arn`.

EKS manages the add-on's Kubernetes resources and associates the IAM
role with the add-on's ServiceAccount.

Set your cluster name and IAM role name:

``` bash
CLUSTER_NAME="your-cluster-name"
ROLE_NAME="AmazonEKS_EBS_CSI_DriverRole"
```

Get the IAM role ARN:

``` bash
ROLE_ARN=$(aws iam get-role \
  --role-name "$ROLE_NAME" \
  --query 'Role.Arn' \
  --output text)
```

Install the add-on:

``` bash
aws eks create-addon \
  --cluster-name "$CLUSTER_NAME" \
  --addon-name aws-ebs-csi-driver \
  --service-account-role-arn "$ROLE_ARN"
```

This installs the AWS-managed EBS CSI Driver add-on and configures the
IAM role for its ServiceAccount.

If the add-on is already installed, use `aws eks update-addon` instead
of `create-addon`.

### Step 5: ServiceAccount reference

The EBS CSI Driver uses this ServiceAccount:

-   Name: `ebs-csi-controller-sa`
-   Namespace: `kube-system`

With the managed add-on and `--service-account-role-arn`, EKS manages
the ServiceAccount configuration. You normally do not need to apply a
separate ServiceAccount manifest.

For reference, the equivalent IRSA ServiceAccount annotation looks like
this:

``` yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ebs-csi-controller-sa
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<AWS_ACCOUNT_ID>:role/AmazonEKS_EBS_CSI_DriverRole
```

Use this manifest only if you are managing the ServiceAccount yourself.
Do not create a competing ServiceAccount configuration unnecessarily
when using the EKS-managed add-on.

### Step 6: Verify the add-on

Check the add-on status:

``` bash
aws eks describe-addon \
  --cluster-name "$CLUSTER_NAME" \
  --addon-name aws-ebs-csi-driver \
  --query 'addon.status' \
  --output text
```

Expected status:

``` text
ACTIVE
```

Check the EBS CSI Driver pods:

``` bash
kubectl get pods -n kube-system | grep ebs-csi
```

Check the ServiceAccount:

``` bash
kubectl get serviceaccount ebs-csi-controller-sa -n kube-system
```

Check StorageClasses:

``` bash
kubectl get storageclass
```

> Installing the EBS CSI Driver does not guarantee that a StorageClass
> exists or is marked as the default. Create or configure a StorageClass
> separately if your workloads need one.

------------------------------------------------------------------------

## 3. Installing Add-ons That Do Not Require an IAM Role

For add-ons such as CoreDNS and kube-proxy, you do not need to create an
IAM role or ServiceAccount-to-IAM-role association.

For example, install CoreDNS:

``` bash
aws eks create-addon \
  --cluster-name "$CLUSTER_NAME" \
  --addon-name coredns
```

Install kube-proxy:

``` bash
aws eks create-addon \
  --cluster-name "$CLUSTER_NAME" \
  --addon-name kube-proxy
```

If either add-on is already installed, do not run `create-addon` again.
Check its status first:

``` bash
aws eks list-addons \
  --cluster-name "$CLUSTER_NAME"
```

Some clusters already have CoreDNS, kube-proxy, and VPC CNI installed as
part of cluster creation. This depends on how the cluster was created
and configured.

------------------------------------------------------------------------

## 4. Check Whether an Add-on Requires IAM Permissions

Before installing an add-on, you can ask EKS whether it requires IAM
permissions.

Get your Kubernetes version:

``` bash
K8S_VERSION=$(aws eks describe-cluster \
  --name "$CLUSTER_NAME" \
  --query 'cluster.version' \
  --output text)
```

Inspect the EBS CSI Driver add-on information:

``` bash
aws eks describe-addon-versions \
  --addon-name aws-ebs-csi-driver \
  --kubernetes-version "$K8S_VERSION" \
  --query 'addons[].{Addon:addonName,Versions:addonVersions[].addonVersion,RequiresIAM:addonVersions[].requiresIamPermissions}'
```

Look for:

``` text
RequiresIAM: true
```

If it is `true`, review the add-on's IAM requirements and configure an
appropriate identity and permissions policy.

If it is `false`, a separate IAM role for the add-on is not required.

You can also inspect the add-on configuration with the AWS CLI
`describe-addon-configuration` operation to find suggested IAM policies
and ServiceAccount information.

------------------------------------------------------------------------

## 5. Understand the Difference

  Component                   Responsibility
  --------------------------- ---------------------------------------------------------
  EKS Add-on                  Installs and manages the add-on software in the cluster
  Kubernetes ServiceAccount   Provides an identity to Kubernetes pods
  IAM Role                    Grants AWS permissions to the add-on's pods

For the EBS CSI Driver:

1.  EKS installs the EBS CSI Driver add-on.
2.  The driver runs in Kubernetes pods using `ebs-csi-controller-sa`.
3.  IRSA associates that ServiceAccount with
    `AmazonEKS_EBS_CSI_DriverRole`.
4.  The IAM role provides permission to manage EBS volumes.

**Applying a ServiceAccount alone does not install the EBS CSI Driver.
Creating an IAM role alone does not install it either.**

------------------------------------------------------------------------

## 6. Useful Commands

List installed add-ons:

``` bash
aws eks list-addons \
  --cluster-name "$CLUSTER_NAME"
```

Check a specific add-on:

``` bash
aws eks describe-addon \
  --cluster-name "$CLUSTER_NAME" \
  --addon-name aws-ebs-csi-driver
```

List Kubernetes pods in `kube-system`:

``` bash
kubectl get pods -n kube-system
```

List ServiceAccounts:

``` bash
kubectl get serviceaccounts -n kube-system
```

List StorageClasses:

``` bash
kubectl get storageclass
```

------------------------------------------------------------------------

## 7. AWS Documentation

-   [Amazon EKS
    Add-ons](https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html)
-   [Create an Amazon EKS
    Add-on](https://docs.aws.amazon.com/eks/latest/userguide/creating-an-add-on.html)
-   [IAM Roles for Amazon EKS
    Add-ons](https://docs.aws.amazon.com/eks/latest/userguide/add-ons-iam.html)
-   [AWS Add-ons and Their
    Requirements](https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html)
-   [Retrieve IAM Information About an
    Add-on](https://docs.aws.amazon.com/eks/latest/userguide/retreive-iam-info.html)
-   [Amazon EBS CSI
    Driver](https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html)
