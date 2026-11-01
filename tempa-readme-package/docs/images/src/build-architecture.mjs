import { Svg, C, toPng, OUT_DIR } from './lib.mjs';
import path from 'path';

const W = 2070, H = 1830;
const s = new Svg(W, H);

// ───────── Title ─────────
s.text(30, 52, 'Voting App on Amazon EKS', { size: 30, weight: 800 });
s.text(30, 80, 'ALB Ingress  ·  EBS CSI dynamic provisioning  ·  Argo CD GitOps  ·  kube-prometheus-stack  ·  IRSA service accounts', { size: 14, fill: C.mute });

// ───────── Left column: Route 53 + Users ─────────
s.card(30, 120, 210, 84, { logo: 'amazon-route53', title: 'Amazon Route 53', accent: '#8C4FFF', sub: ['*.example.com → ALB (alias A)'], ssize: 11 });
s.rect(30, 238, 210, 92, { fill: '#fff', stroke: C.gray, sw: 1.6, r: 9 });
// simple browser glyph
s.rect(44, 252, 44, 34, { fill: '#e2e8f0', stroke: C.gray, sw: 1.4, r: 4 });
s.add(`<rect x="44" y="252" width="44" height="9" rx="3" fill="${C.gray}"/>`);
s.text(102, 272, 'Users', { size: 14, weight: 700 });
s.text(102, 289, 'Browser', { size: 11, fill: C.mute });
s.text(44, 314, 'HTTPS :443 → https://vote.example.com', { size: 10, fill: C.mute });
s.arrow([[135, 238], [135, 206]], { color: C.gray, w: 1.8 });
s.badge(1, 135, 222, C.gray);

// ───────── AWS Cloud / VPC ─────────
s.rect(270, 110, 1480, 1410, { fill: '#fffdf8', stroke: C.aws, sw: 2.2, r: 14 });
s.img('aws', 284, 118, 26);
s.text(318, 137, 'AWS Cloud', { size: 14, weight: 700, fill: '#b45309' });
s.text(1735, 137, 'Region: e.g. eu-north-1  ·  3 Availability Zones', { size: 12, fill: C.mute, anchor: 'end' });

s.rect(295, 150, 1430, 1195, { fill: '#fcfef8', stroke: C.vpc, sw: 2, r: 12 });
s.text(310, 168, 'VPC  10.0.0.0/16', { size: 12, weight: 700, fill: '#4d6a0b' });

// public subnets
s.rect(315, 178, 1390, 162, { fill: '#f1f8e5', stroke: C.vpc, sw: 1.4, dash: '6 4', r: 10 });
s.text(328, 196, 'Public subnets · 3 AZs', { size: 11, weight: 700, fill: '#4d6a0b' });
s.chip(1560, 186, 130, 24, 'NAT Gateway', { fill: '#e8f5d0', stroke: C.vpc });

// ALB bar
s.rect(350, 214, 1340, 118, { fill: '#fff', stroke: C.alb, sw: 2.2, r: 10 });
s.img('aws-alb', 362, 222, 30);
s.text(400, 243, 'Application Load Balancer', { size: 14, weight: 700 });
s.text(400, 261, 'internet-facing · one shared ALB (IngressGroup: voting-shared) · TLS terminated with ACM cert · target-type: ip (straight to pod IPs)', { size: 10.5, fill: C.mute });
s.chip(1548, 223, 134, 20, 'ACM certificate', { fill: '#f3e8ff', stroke: C.alb });
s.chip(1400, 223, 138, 20, 'AWS WAF (optional)', { fill: '#f3e8ff', stroke: C.alb });
// host-rule chips (drop lines start under them)
const chipY = 284, chipH = 36;
const drops = [
  { x: 535, t: 'vote.example.com', c: C.flow },
  { x: 845, t: 'api.example.com', c: C.flow },
  { x: 1160, t: 'grafana.example.com', c: C.prom },
  { x: 1318, t: 'prometheus.example.com', c: C.prom },
  { x: 1515, t: 'argocd.example.com', c: C.argo },
];
const cw = { 535: 150, 845: 150, 1160: 140, 1318: 152, 1515: 130 };
// avoid overlap of grafana/prometheus chips
const chipX = { 535: 535 - 75, 845: 845 - 75, 1160: 1160 - 70, 1318: 1318 - 76, 1515: 1515 - 65 };
drops.forEach((d) => s.chip(chipX[d.x], chipY, cw[d.x], chipH, d.t, { fill: '#fff', stroke: d.c, mono: true, size: 10, weight: 600 }));
s.text(362, 312, 'Ingress host rules  ▸', { size: 10.5, fill: C.alb, weight: 700 });

// ───────── Private subnets + EKS cluster ─────────
s.rect(315, 360, 1390, 968, { fill: '#f0f7fc', stroke: C.priv, sw: 1.4, dash: '6 4', r: 10 });
s.text(570, 378, 'Private subnets · 3 AZs · EC2 node group', { size: 11, weight: 700, fill: '#0b5a85' });

s.rect(335, 392, 1350, 760, { fill: '#ffffff', stroke: C.k8s, sw: 2.2, r: 12 });
s.img('amazon-eks', 560, 394, 24);
s.text(590, 411, 'Amazon EKS cluster', { size: 13, weight: 700, fill: '#1e40af' });
s.text(722, 411, '(control plane managed by AWS)', { size: 10.5, fill: C.mute });

const nsHeader = (x, y, w, label, color, lg) => {
  s.add(`<rect x="${x}" y="${y}" width="${w}" height="28" rx="8" fill="${color}" opacity="0.14"/>`);
  s.img(lg, x + 8, y + 5, 18);
  s.text(x + 32, y + 19, label, { size: 12.5, weight: 700, fill: C.ink, mono: true });
};

// ===== voting-app-ns (col 1) =====
s.rect(350, 442, 640, 693, { fill: '#f7faff', stroke: C.k8s, sw: 1.6, r: 10 });
nsHeader(350, 442, 640, 'ns: voting-app-ns', C.k8s, 'kubernetes');

s.card(370, 490, 330, 140, {
  logo: 'react', title: 'frontend  ·  Deployment ×2', accent: C.k8s,
  sub: ['React 19 · Vite 6 · TypeScript · Bootstrap', 'nginx-unprivileged :8080 (static SPA)', 'Service: frontend (ClusterIP :80 → 8080)'],
});
s.chip(384, 598, 108, 20, 'SA: frontend-sa', { fill: '#eef2ff', stroke: '#818cf8', mono: true, size: 9.5 });

s.card(720, 490, 250, 140, {
  logo: 'go', title: 'api  ·  Deployment ×2', accent: C.k8s,
  sub: ['Go · gorilla/mux :8080', '/languages  /ok  /cpu  /version', 'Service: api-svc (ClusterIP :80)', { t: '+ /metrics :9090  (to be added)', fill: C.warn, weight: 700 }],
});
s.chip(734, 598, 90, 20, 'SA: api-sa', { fill: '#eef2ff', stroke: '#818cf8', mono: true, size: 9.5 });

// mongo
s.rect(370, 670, 600, 160, { fill: '#fff', stroke: C.mongo, sw: 1.6, r: 9 });
s.img('mongodb', 380, 678, 26);
s.text(414, 696, 'mongo-st-set  ·  StatefulSet ×3  ·  replica set rs0', { size: 13, weight: 700 });
s.text(414, 712, 'headless svc mongo-svc  ·  creds from Secret mongodb-secret  ·  spread across AZs', { size: 10.5, fill: C.mute });
const px = [385, 590, 795];
['a', 'b', 'c'].forEach((az, i) => {
  s.rect(px[i], 726, 175, 78, { fill: '#f0fdf4', stroke: C.mongo, sw: 1.2, r: 7 });
  s.text(px[i] + 10, 746, `mongo-st-set-${i}`, { size: 11.5, weight: 700, mono: true });
  s.text(px[i] + 10, 763, i === 0 ? 'PRIMARY / SECONDARY' : 'SECONDARY (elected)', { size: 9.5, fill: C.mute });
  s.chip(px[i] + 10, 774, 70, 20, 'AZ-' + az, { fill: '#dcfce7', stroke: C.mongo, size: 10 });
});
s.arrow([[845, 630], [845, 670]], { color: C.flow, w: 2.2 });
s.badge(4, 868, 650, C.flow);

// PVC row
px.forEach((x, i) => {
  s.rect(x, 900, 175, 48, { fill: '#fff', stroke: C.ctl, sw: 1.4, r: 7 });
  s.text(x + 10, 920, 'PVC  data-…-' + i, { size: 11, weight: 700, mono: true });
  s.text(x + 10, 937, '1Gi · ReadWriteOnce', { size: 9.5, fill: C.mute });
  s.arrow([[x + 87, 900], [x + 87, 806]], { color: C.mute, w: 1.5, dash: '4 3' });
});
// StorageClass bar
s.rect(370, 1004, 600, 52, { fill: '#f5f3ff', stroke: C.ctl, sw: 1.8, r: 8 });
s.text(384, 1024, 'StorageClass  ebs-gp3   (cluster-scoped)', { size: 12.5, weight: 700, fill: '#5b21b6' });
s.text(384, 1042, 'provisioner: ebs.csi.aws.com · type gp3 · encrypted · WaitForFirstConsumer · allowVolumeExpansion', { size: 10, fill: C.mute });
px.forEach((x) => {
  s.arrow([[x + 87, 949], [x + 87, 1003]], { color: C.ctl, w: 1.8 });
});
// PV row
px.forEach((x, i) => {
  s.arrow([[x + 87, 1057], [x + 87, 1077]], { color: C.ctl, w: 1.8 });
  s.rect(x, 1078, 175, 44, { fill: '#fff', stroke: C.ctl, sw: 1.4, r: 7 });
  s.text(x + 10, 1097, 'PV  pvc-… (dynamic)', { size: 11, weight: 700, mono: true });
  s.text(x + 10, 1113, 'csi: ebs.csi.aws.com', { size: 9.5, fill: C.mute });
});
s.badge(5, 372, 1030, C.ctl);

// ===== monitoring ns (col 2) =====
s.rect(1010, 442, 330, 463, { fill: '#fff8f5', stroke: C.prom, sw: 1.6, r: 10 });
nsHeader(1010, 442, 330, 'ns: monitoring', C.prom, 'prometheus');

s.card(1030, 490, 260, 66, { logo: 'grafana', title: 'Grafana', accent: C.prom, sub: ['dashboards-as-code · PVC on ebs-gp3'], lg_s: 26 });
s.card(1030, 592, 270, 120, { logo: 'prometheus', title: 'Prometheus  ·  StatefulSet', accent: C.prom,
  sub: ['TSDB on PVC (ebs-gp3)', 'discovers ServiceMonitor / PodMonitor', 'scrapes kubelet, cAdvisor, nodes, app'], lg_s: 26 });
s.arrow([[1160, 558], [1160, 591]], { color: C.prom, w: 1.8 });
s.card(1030, 730, 270, 58, { logo: 'prometheus', title: 'Alertmanager', accent: C.prom, sub: ['routes alerts → Slack / email'], lg_s: 22 });
const mini = [['Prometheus', 'Operator'], ['kube-state-', 'metrics'], ['node-exporter', '(DaemonSet)']];
mini.forEach((m, i) => {
  const x = 1025 + i * 103;
  s.rect(x, 804, 98, 84, { fill: '#fff', stroke: C.prom, sw: 1.1, r: 7 });
  s.text(x + 49, 836, m[0], { size: 10.5, weight: 700, anchor: 'middle' });
  s.text(x + 49, 851, m[1], { size: 10.5, weight: 700, anchor: 'middle' });
  s.text(x + 49, 874, ['CRDs', 'object state', 'node metrics'][i], { size: 9.5, fill: C.mute, anchor: 'middle' });
});

// ===== argocd ns (col 3) =====
s.rect(1360, 442, 310, 463, { fill: '#fff9f5', stroke: C.argo, sw: 1.6, r: 10 });
nsHeader(1360, 442, 310, 'ns: argocd', C.argo, 'argocd');
s.card(1375, 490, 280, 70, { logo: 'argocd', title: 'argocd-server', accent: C.argo, sub: ['UI + API · TLS terminated at ALB'], lg_s: 26 });
s.card(1375, 576, 280, 62, { logo: 'argocd', title: 'repo-server', accent: C.argo, sub: ['clones Git · renders Helm / plain YAML'], lg_s: 22 });
s.card(1375, 654, 280, 62, { logo: 'argocd', title: 'application-controller', accent: C.argo, sub: ['diff desired vs live · auto-sync · self-heal'], lg_s: 22 });
s.rect(1375, 732, 280, 160, { fill: '#fff', stroke: C.argo, sw: 1.2, r: 9, dash: '5 3' });
s.text(1389, 752, 'Application CRDs', { size: 12, weight: 700 });
s.lines(1389, 774, ['▸ voting-app', '\u00a0\u00a0\u00a0path: votingApp-manifestFiles/', '▸ kube-prometheus-stack', '\u00a0\u00a0\u00a0Helm chart → ns monitoring', '▸ (optional) aws-lbc · ebs-csi'], { size: 10.5, fill: C.mute, mono: true, lh: 17 });

// ===== kube-system strip =====
s.rect(1010, 945, 660, 190, { fill: '#f8fafc', stroke: C.gray, sw: 1.6, r: 10 });
nsHeader(1010, 945, 660, 'ns: kube-system', C.gray, 'kubernetes');
s.text(1655, 964, 'EKS add-ons: VPC CNI · CoreDNS · kube-proxy', { size: 10, fill: C.mute, anchor: 'end' });
s.card(1025, 982, 180, 142, { logo: 'amazon-ec2', title: 'EBS CSI controller', accent: C.ctl, tsize: 12, lg_s: 24,
  sub: ['aws-ebs-csi-driver', 'csi-provisioner · attacher', 'resizer · snapshotter'], ssize: 10 });
s.chip(1035, 1096, 160, 20, 'SA: ebs-csi-controller-sa', { fill: '#eef2ff', stroke: '#818cf8', mono: true, size: 8.5 });
s.card(1215, 982, 180, 142, { logo: 'aws-alb', title: 'AWS LB Controller', accent: C.alb, tsize: 12, lg_s: 24,
  sub: ['watches Ingress objects', 'creates ALB · listeners', 'TargetGroupBindings'], ssize: 10 });
s.chip(1222, 1096, 166, 20, 'SA: aws-load-balancer-controller', { fill: '#eef2ff', stroke: '#818cf8', mono: true, size: 7.5 });
s.card(1405, 982, 250, 142, { logo: 'amazon-ec2', title: 'EBS CSI node  (DaemonSet)', accent: C.ctl, tsize: 12, lg_s: 24,
  sub: ['runs on every worker node', 'NodeStage / NodePublish volume', 'formats (ext4) + mounts EBS'], ssize: 10 });

// ───────── Cross-cutting arrows ─────────
s.arrow([[242, 290], [349, 290]], { color: C.flow, w: 2.4 });
s.badge(2, 262, 290, C.flow);
// ALB → services (3)
s.arrow([[535, 320], [535, 489]], { color: C.flow, w: 2.4 });
s.arrow([[845, 320], [845, 489]], { color: C.flow, w: 2.4 });
s.arrow([[1160, 320], [1160, 489]], { color: C.prom, w: 2.4 });
s.arrow([[1318, 320], [1318, 652], [1301, 652]], { color: C.prom, w: 2.4 });
s.arrow([[1515, 320], [1515, 489]], { color: C.argo, w: 2.4 });
s.badge(3, 535, 395, C.flow);
// Prometheus scrape → api
s.arrow([[1029, 612], [972, 612]], { color: C.prom, w: 2, dash: '5 3' });
s.badge(6, 1002, 612, C.prom);
// Argo sync channel
s.arrow([[1500, 893], [1500, 927], [992, 927]], { color: C.argo, w: 2.2, dash: '6 3' });
s.arrow([[1175, 927], [1175, 906]], { color: C.argo, w: 2.2, dash: '6 3' });
s.text(1195, 921, 'sync voting-app + monitoring', { size: 10, fill: '#c2410c', weight: 600 });
s.badge(7, 1480, 927, C.argo);
// CSI controller → SC (provisioning)
s.arrow([[1024, 1030], [972, 1030]], { color: C.ctl, w: 2.2 });
// PV → EBS volumes
const ebsX = [385, 590, 795];
ebsX.forEach((x) => s.arrow([[x + 87, 1123], [x + 87, 1238]], { color: C.ctl, w: 2 }));
// EBS box (outside cluster)
s.rect(350, 1190, 640, 120, { fill: '#fff7ed', stroke: C.aws, sw: 1.8, r: 10 });
s.chip(362, 1198, 64, 20, 'AWS EBS', { fill: '#ffedd5', stroke: C.aws, size: 10 });
s.text(436, 1213, 'gp3 volumes · encrypted · one per AZ (AZ-pinned)', { size: 11.5, weight: 700 });
['a', 'b', 'c'].forEach((az, i) => {
  s.rect(ebsX[i], 1240, 175, 56, { fill: '#fff', stroke: C.aws, sw: 1.3, r: 7 });
  s.text(ebsX[i] + 10, 1262, 'vol-0… (1Gi)', { size: 11, weight: 700, mono: true });
  s.chip(ebsX[i] + 10, 1272, 62, 18, 'AZ-' + az, { fill: '#ffedd5', stroke: C.aws, size: 9.5 });
});
// CSI controller → EC2 API (dashed)
s.arrow([[1070, 1124], [1070, 1250], [992, 1250]], { color: C.ctl, w: 1.8, dash: '5 3' });

// ───────── IAM / IRSA row ─────────
s.card(1005, 1385, 215, 112, { logo: 'aws-iam', title: 'IAM role · EBS CSI', accent: C.aws, tsize: 12, lg_s: 24,
  sub: ['AmazonEBSCSIDriverPolicy', 'trust: OIDC · sa ebs-csi-controller-sa'], ssize: 9.5 });
s.card(1245, 1385, 215, 112, { logo: 'aws-iam', title: 'IAM role · LB Controller', accent: C.aws, tsize: 12, lg_s: 24,
  sub: ['AWSLoadBalancerController policy', 'trust: OIDC · sa aws-load-balancer-…'], ssize: 9.5 });
s.card(1495, 1385, 235, 112, { logo: 'aws-iam', title: 'IAM OIDC provider (EKS)', accent: C.aws, tsize: 12, lg_s: 24,
  sub: ['issuer = cluster OIDC URL', 'STS AssumeRoleWithWebIdentity', '→ IRSA (no static keys)'], ssize: 9.5 });
s.arrow([[1115, 1124], [1115, 1384]], { color: C.aws, w: 2, dash: '6 3' });
s.arrow([[1320, 1124], [1320, 1384]], { color: C.aws, w: 2, dash: '6 3' });
s.badge(8, 1115, 1300, C.aws);
s.arrow([[1494, 1441], [1462, 1441]], { color: C.aws, w: 1.6, dash: '3 3' });
// KMS
s.card(350, 1385, 300, 112, { accent: C.aws, sub: ['encrypts EBS volumes (gp3)', 'referenced by StorageClass kmsKeyId'], ssize: 10 });
s.chip(362, 1397, 40, 20, 'KMS', { fill: '#ffedd5', stroke: C.aws, size: 10 });
s.add(`<text x="414" y="1412" font-size="12" font-weight="700" fill="${C.ink}">AWS KMS key</text>`);
s.arrow([[500, 1384], [500, 1312]], { color: C.aws, w: 1.6, dash: '4 3' });

// ───────── Delivery plane (outside AWS) ─────────
s.text(1790, 160, 'CI/CD & GitOps (outside AWS)', { size: 12, weight: 700, fill: C.mute });
s.card(1790, 180, 230, 76, { logo: 'docker', title: 'Docker Hub', accent: '#2496ED', sub: ['ozairkhan1/voteapp-api-go', 'ozairkhan1/voteapp-frontend-react'], ssize: 10 });
s.arrow([[1788, 199], [1692, 199]], { color: '#2496ED', w: 1.8, dash: '5 3' });
s.text(1728, 178, 'image pull', { size: 9.5, fill: '#2496ED', weight: 600 });

s.rect(1790, 300, 230, 206, { fill: '#fff', stroke: C.gl, sw: 1.6, r: 9 });
s.img('gitlab', 1800, 309, 28);
s.text(1836, 329, 'GitLab CI pipeline', { size: 13, weight: 700 });
s.lines(1802, 354, ['1  gitleaks (secret scan)', '2  SonarQube quality gate', '3  OWASP dependency-check', '4  Trivy filesystem scan', '5  Docker build (API + UI)', '6  Trivy image scan', '7  push to Docker Hub', '8  bump image tag in Git'], { size: 10.5, fill: C.mute, lh: 17 });
s.arrow([[1905, 299], [1905, 258]], { color: C.gl, w: 2 });
s.text(1915, 283, 'push image', { size: 9.5, fill: C.gl, weight: 600 });

s.card(1790, 575, 230, 84, { logo: 'github', title: 'Kubernetes-ManifestFiles', accent: C.gray, tsize: 12.5, sub: ['GitOps repo (source of truth)', 'votingApp-manifestFiles/'], ssize: 10.5 });
s.arrow([[1905, 507], [1905, 573]], { color: C.gl, w: 2 });
s.text(1915, 546, 'commit new tag', { size: 9.5, fill: C.gl, weight: 600 });
s.arrow([[1788, 607], [1657, 607]], { color: C.argo, w: 2.4 });
s.badge(7, 1730, 607, C.argo);
s.text(1770, 598, 'pull', { size: 9.5, fill: C.argo, weight: 700, anchor: 'middle' });

s.card(1790, 780, 230, 66, { title: 'Developer', accent: C.gray, sub: ['git push → pipeline starts'], ssize: 10.5 });
s.arrow([[2021, 813], [2048, 813], [2048, 403], [2022, 403]], { color: C.gray, w: 1.8 });

// ───────── Legend / numbered flow ─────────
s.rect(30, 1560, 2010, 235, { fill: '#fff', stroke: C.line, sw: 1.2, r: 12 });
s.text(48, 1590, 'How to read this diagram', { size: 15, weight: 800 });
const steps = [
  ['1', C.gray, 'DNS', 'Route 53 resolves *.example.com to the ALB (alias record).'],
  ['2', C.flow, 'HTTPS', 'Browser connects to the internet-facing ALB on :443 (ACM certificate).'],
  ['3', C.flow, 'Ingress', 'AWS LB Controller programs host rules; ALB sends traffic straight to pod IPs.'],
  ['4', C.flow, 'App path', 'React SPA calls api.example.com; API talks to the MongoDB replica set (mongo-svc).'],
  ['5', C.ctl, 'Storage', 'PVC → StorageClass ebs-gp3 → EBS CSI creates a gp3 volume per AZ → PV bound, attached, mounted.'],
  ['6', C.prom, 'Metrics', 'Prometheus scrapes nodes + kube-state-metrics today; API /metrics once added (dashed).'],
  ['7', C.argo, 'GitOps', 'CI bumps the image tag in the manifests repo; Argo CD pulls and syncs voting-app + monitoring.'],
  ['8', C.aws, 'IRSA', 'Controller ServiceAccounts assume scoped IAM roles via the OIDC provider (no static keys).'],
];
steps.forEach((st, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x = 48 + col * 690, y = 1620 + row * 38;
  s.badge(st[0], x + 11, y - 4, st[1]);
  s.text(x + 30, y, st[2] + ':', { size: 11.5, weight: 700 });
  s.text(x + 30 + 62, y, st[3], { size: 11.5, fill: C.mute });
});
// key
s.text(1440, 1590, 'Key', { size: 13, weight: 800 });
s.arrow([[1440, 1612], [1500, 1612]], { color: C.flow, w: 2.4 });
s.text(1510, 1616, 'request traffic', { size: 11, fill: C.mute });
s.arrow([[1440, 1636], [1500, 1636]], { color: C.argo, w: 2.2, dash: '6 3' });
s.text(1510, 1640, 'GitOps / sync / control', { size: 11, fill: C.mute });
s.arrow([[1440, 1660], [1500, 1660]], { color: C.aws, w: 2, dash: '6 3' });
s.text(1510, 1664, 'IAM / IRSA trust', { size: 11, fill: C.mute });
s.arrow([[1440, 1684], [1500, 1684]], { color: C.ctl, w: 2.2 });
s.text(1510, 1688, 'storage provisioning', { size: 11, fill: C.mute });
s.text(1440, 1712, '+ /metrics … (to be added)', { size: 11, fill: C.warn, weight: 700 });
s.text(1440, 1730, 'orange text = not in the repo yet', { size: 10.5, fill: C.mute });
s.text(48, 1780, 'Logos are trademarks of their respective owners (simple-icons, CC0). Domain names are placeholders.', { size: 10, fill: C.mute });

await toPng(s.render(), path.join(OUT_DIR, 'architecture.svg'), path.join(OUT_DIR, 'architecture.png'), 1.5);
console.log('architecture done');
