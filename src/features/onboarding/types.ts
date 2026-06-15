export type PermissionReadiness = {
  screenGranted: boolean;
  ocrAvailable: boolean;
  ready: boolean;
  loading: boolean;
};

export type SetupModelChoice = "api" | "local";
