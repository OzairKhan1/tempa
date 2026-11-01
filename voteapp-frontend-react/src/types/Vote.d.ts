export {};

interface ReactEnv {
  API_BASE_URL: string;
}

declare global {
  interface Window {
    _env_: ReactEnv;
  }
}
