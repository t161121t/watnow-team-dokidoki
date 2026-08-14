export interface ProductionEnvOptions {
  requireValues?: boolean;
}

export function getProductionEnvErrors(
  env: Readonly<Record<string, string | undefined>>,
  options?: ProductionEnvOptions,
): string[];
