import { Svg, C, toPng, OUT_DIR } from './lib.mjs';
import path from 'path';
const out = (n) => [path.join(OUT_DIR, n + '.svg'), path.join(OUT_DIR, n + '.png')];

// ───────── 1. CI/CD + GitOps flow ─────────
{
  const s = new Svg(1900, 640);
  s.text(30, 46, 'CI/CD and GitOps flow', { size: 26, weight: 800 });
  s.text(30, 72, 'GitLab CI builds, scans and publishes images; Argo CD pulls the desired state from Git into EKS', { size: 13, fill: C.mute });
  const y = 120;
  s.card(30, y, 190, 90, { title: 'Developer', accent: C.gray, sub: ['git push / merge request'] });
  s.card(270, y, 250, 90, { logo: 'gitlab', title: 'GitLab CI', accent: C.gl, sub: ['Pipeline-gitlab.yml', '10 stages'] });
  s.card(570, y, 250, 90, { logo: 'docker', title: 'Docker Hub', accent: '#2496ED', sub: ['voteapp-api-go:vN', 'voteapp-frontend-react:vN'] });
  s.card(870, y, 270, 90, { logo: 'github', title: 'Kubernetes-ManifestFiles', accent: C.gray, sub: ['image tag bumped by CI', 'GitOps source of truth'], tsize: 12.5 });
  s.card(1190, y, 250, 90, { logo: 'argocd', title: 'Argo CD', accent: C.argo, sub: ['auto-sync · prune · self-heal'] });
  s.card(1490, y, 380, 90, { logo: 'amazon-eks', title: 'Amazon EKS', accent: C.aws, sub: ['voting-app-ns · monitoring · kube-system'] });
  [[220, 270], [520, 570], [820, 870], [1140, 1190], [1440, 1490]].forEach(([a, b], i) => s.arrow([[a + 2, y + 45], [b - 2, y + 45]], { color: i === 3 ? C.argo : C.flow, w: 2.4, dash: i === 3 ? '6 3' : undefined }));
  s.text(1165, y - 8, 'pull', { size: 10.5, fill: C.argo, weight: 700, anchor: 'middle' });
  s.text(1465, y - 8, 'apply', { size: 10.5, fill: C.argo, weight: 700, anchor: 'middle' });
  s.text(545, y - 8, 'push', { size: 10.5, fill: C.flow, weight: 700, anchor: 'middle' });
  s.text(845, y - 8, 'commit tag', { size: 10.5, fill: C.flow, weight: 700, anchor: 'middle' });

  // stages
  s.text(30, 270, 'Pipeline stages', { size: 16, weight: 800 });
  const st = [
    ['gitleaks', 'Secret scan of the repo history', 'go'],
    ['SonarQube', 'Code quality gate (main branch)', 'sonarqube'],
    ['OWASP DC', 'Dependency CVE scan, fail at CVSS ≥ 7', 'owasp'],
    ['Trivy fs', 'Filesystem vuln + secret scan', 'trivy'],
    ['Docker build', 'API (Go, distroless) + UI (nginx)', 'docker'],
    ['Trivy image', 'HIGH/CRITICAL image scan', 'trivy'],
    ['Push', 'Tag = v$CI_PIPELINE_IID', 'docker'],
    ['Update manifests', 'sed new tag → git push', 'github'],
  ];
  st.forEach((e, i) => {
    const x = 30 + i * 232;
    s.rect(x, 292, 218, 120, { fill: '#fff', stroke: C.gl, sw: 1.4, r: 10 });
    s.badge(i + 1, x + 20, 312, C.gl);
    if (e[0] !== 'gitleaks') s.img(e[2], x + 176, 300, 30);
    s.text(x + 14, 350, e[0], { size: 13.5, weight: 700 });
    s.lines(x + 14, 370, wrap(e[1], 28), { size: 11, fill: C.mute });
    if (i < 7) s.arrow([[x + 220, 352], [x + 230, 352]], { color: C.gl, w: 2 });
  });
  function wrap(t, n) { const w = t.split(' '); const l = ['']; w.forEach((x) => { if ((l.at(-1) + ' ' + x).trim().length > n) l.push(x); else l[l.length - 1] = (l.at(-1) + ' ' + x).trim(); }); return l; }
  s.rect(30, 450, 1840, 150, { fill: '#fff', stroke: C.line, r: 12 });
  s.text(50, 480, 'Why this is GitOps', { size: 15, weight: 800 });
  s.lines(50, 506, [
    '•  CI never talks to the cluster – it only publishes an image and edits a tag in Git (no kubeconfig / cloud keys in the pipeline).',
    '•  Argo CD runs inside EKS and pulls from Git, so the cluster state can always be reproduced from the manifests repo.',
    '•  Rollback = git revert. Drift is corrected automatically by self-heal.',
  ], { size: 12.5, fill: C.mute, lh: 24 });
  await toPng(s.render(), ...out('cicd-gitops-flow'), 1.5);
}

// ───────── 2. EBS CSI dynamic provisioning ─────────
{
  const s = new Svg(1900, 700);
  s.text(30, 46, 'Dynamic storage provisioning with the EBS CSI driver', { size: 26, weight: 800 });
  s.text(30, 72, 'What happens when the MongoDB StatefulSet starts on EKS (replaces the static local PVs used on k3s)', { size: 13, fill: C.mute });
  const steps = [
    ['StatefulSet', 'mongo-st-set', 'volumeClaimTemplates → storageClassName: ebs-gp3', 'kubernetes', C.k8s],
    ['PVC', 'data-mongo-st-set-N', 'Pending until the pod is scheduled (WaitForFirstConsumer)', 'kubernetes', C.k8s],
    ['StorageClass', 'ebs-gp3', 'provisioner ebs.csi.aws.com · gp3 · encrypted', 'kubernetes', C.ctl],
    ['csi-provisioner', 'EBS CSI controller', 'sees PVC in the pod\'s AZ, calls CreateVolume', 'amazon-ec2', C.ctl],
    ['Amazon EBS', 'gp3 volume', 'created in the same AZ as the chosen node', 'aws', C.aws],
    ['PV', 'pvc-<uid>', 'created automatically and bound to the PVC', 'kubernetes', C.k8s],
    ['csi-attacher + node plugin', 'EBS CSI node', 'AttachVolume → format ext4 → mount /data/db', 'amazon-ec2', C.ctl],
  ];
  steps.forEach((e, i) => {
    const x = 30 + i * 262, y = 130;
    s.rect(x, y, 240, 190, { fill: '#fff', stroke: e[4], sw: 1.8, r: 12 });
    s.badge(i + 1, x + 22, y + 24, e[4]);
    s.img(e[3], x + 190, y + 12, 34);
    s.text(x + 16, y + 70, e[0], { size: 14, weight: 800 });
    s.text(x + 16, y + 90, e[1], { size: 11.5, mono: true, fill: e[4], weight: 700 });
    const ws = e[2].split(' '); let l = ['']; ws.forEach((w) => { if ((l.at(-1) + ' ' + w).trim().length > 30) l.push(w); else l[l.length - 1] = (l.at(-1) + ' ' + w).trim(); });
    s.lines(x + 16, y + 118, l, { size: 11.5, fill: C.mute, lh: 17 });
    if (i < 6) s.arrow([[x + 242, y + 95], [x + 260, y + 95]], { color: C.ctl, w: 2.4 });
  });
  s.text(30, 380, 'Why WaitForFirstConsumer matters', { size: 16, weight: 800 });
  s.lines(30, 408, [
    'An EBS volume lives in exactly one Availability Zone. With the default Immediate mode the volume could be created in an AZ where the pod can never run.',
    'WaitForFirstConsumer delays creation until the scheduler has picked a node, so the volume is created in that node\'s AZ. Combined with one replica per AZ',
    '(topologySpreadConstraints) each mongo pod gets its own volume in its own AZ.',
  ], { size: 12.5, fill: C.mute, lh: 22 });
  s.rect(30, 500, 1840, 160, { fill: '#f5f3ff', stroke: C.ctl, r: 12 });
  s.text(50, 530, 'Permissions (least privilege via IRSA)', { size: 15, weight: 800 });
  s.lines(50, 556, [
    'ServiceAccount kube-system/ebs-csi-controller-sa  →  IAM role with AmazonEBSCSIDriverPolicy  (trust: cluster OIDC provider, sub = that ServiceAccount).',
    'If the StorageClass sets kmsKeyId, the role also needs kms:CreateGrant / kms:Encrypt / kms:Decrypt / kms:GenerateDataKeyWithoutPlaintext on that key.',
    'The node IAM role needs none of this – only the CSI controller pod can create or attach volumes.',
  ], { size: 12.5, fill: C.mute, lh: 24 });
  await toPng(s.render(), ...out('ebs-csi-dynamic-provisioning'), 1.5);
}

// ───────── 3. Tech-stack board ─────────
{
  const s = new Svg(1900, 760);
  s.text(30, 46, 'Technology stack', { size: 26, weight: 800 });
  const groups = [
    ['Application', C.k8s, [['react', 'React 19'], ['vite', 'Vite 6'], ['typescript', 'TypeScript'], ['bootstrap', 'Bootstrap'], ['axios', 'Axios'], ['go', 'Go + gorilla/mux'], ['mongodb', 'MongoDB 4.2'], ['nginx', 'nginx-unprivileged']]],
    ['Containers & CI', C.gl, [['docker', 'Docker'], ['gitlab', 'GitLab CI'], ['github', 'GitHub'], ['sonarqube', 'SonarQube'], ['owasp', 'OWASP Dep-Check'], ['trivy', 'Trivy']]],
    ['AWS platform (target)', C.aws, [['amazon-eks', 'Amazon EKS'], ['amazon-ec2', 'EC2 + EBS CSI'], ['aws-alb', 'ALB + LB Controller'], ['amazon-route53', 'Route 53'], ['aws-iam', 'IAM / IRSA'], ['terraform', 'Terraform (suggested)']]],
    ['GitOps & observability', C.argo, [['kubernetes', 'Kubernetes'], ['helm', 'Helm'], ['argocd', 'Argo CD'], ['prometheus', 'Prometheus'], ['grafana', 'Grafana'], ['opentelemetry', 'OpenTelemetry (suggested)']]],
  ];
  let y = 80;
  groups.forEach(([name, col, items]) => {
    s.rect(30, y, 1840, 150, { fill: '#fff', stroke: col, sw: 1.6, r: 12 });
    s.text(50, y + 30, name, { size: 15, weight: 800, fill: col });
    items.forEach((it, i) => {
      const x = 50 + i * 225;
      s.img(it[0], x + 60, y + 48, 54);
      s.text(x + 87, y + 128, it[1], { size: 12, weight: 600, anchor: 'middle' });
    });
    y += 166;
  });
  await toPng(s.render(), ...out('tech-stack'), 1.5);
}
console.log('done');
