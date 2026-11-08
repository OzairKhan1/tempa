export {};

interface SiteItem {
  name: string;
  logo?: string; // file name inside /img/logos, e.g. "docker.svg"
  note?: string;
}

interface SiteSection {
  title: string;
  items: SiteItem[];
}

interface SiteConfig {
  title?: string;
  owner?: string;
  tagline?: string;
  footer?: string;
  sections?: SiteSection[];
}

interface ReactEnv {
  API_BASE_URL: string;
  SITE?: SiteConfig;
}

declare global {
  interface Window {
    _env_: ReactEnv;
  }
}
