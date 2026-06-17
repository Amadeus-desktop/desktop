import {
  buildLocalPersonaCache,
  mergeRemotePersonaCache,
  type CloudPersonaSnapshot,
  type LocalPersonaCache,
} from "../../../domain/persona";
import {
  listLocalPersonas as defaultListLocalPersonas,
  upsertLocalPersonas as defaultUpsertLocalPersonas,
} from "../../timeline/adapters/timelineRepository";
import { bootstrapUserPersonas as defaultBootstrapUserPersonas } from "./bootstrapUserPersonas";
import { pullCloudPersonas as defaultPullCloudPersonas } from "./supabasePersonaRepository";

type Dependencies = {
  bootstrapUserPersonas: () => Promise<void>;
  pullCloudPersonas: () => Promise<CloudPersonaSnapshot[]>;
  listLocalPersonas: () => Promise<LocalPersonaCache[]>;
  upsertLocalPersonas: (
    personas: LocalPersonaCache[],
  ) => Promise<LocalPersonaCache[]>;
};

const defaultDependencies: Dependencies = {
  bootstrapUserPersonas: defaultBootstrapUserPersonas,
  pullCloudPersonas: defaultPullCloudPersonas,
  listLocalPersonas: defaultListLocalPersonas,
  upsertLocalPersonas: defaultUpsertLocalPersonas,
};

export async function syncCloudPersonasToLocalCache(
  dependencies: Dependencies = defaultDependencies,
): Promise<LocalPersonaCache[]> {
  await dependencies.bootstrapUserPersonas();
  const [remotePersonas, localPersonas] = await Promise.all([
    dependencies.pullCloudPersonas(),
    dependencies.listLocalPersonas(),
  ]);

  const localByRemoteId = new Map(
    localPersonas.map((persona) => [persona.remotePersonaId, persona]),
  );
  const localBySlug = new Map(
    localPersonas.map((persona) => [persona.slug, persona]),
  );
  const nextCaches = remotePersonas
    .map((remote) =>
      mergeRemotePersonaCache(
        localByRemoteId.get(remote.remotePersonaId) ??
          localBySlug.get(remote.slug) ??
          null,
        remote,
      ),
    )
    .filter((decision) => decision.action !== "keep")
    .map((decision) => decision.cache);

  if (nextCaches.length === 0) {
    return localPersonas;
  }

  await dependencies.upsertLocalPersonas(nextCaches);

  const mergedBySlug = new Map(
    localPersonas.map((persona) => [persona.slug, persona]),
  );
  for (const cache of nextCaches) {
    mergedBySlug.set(cache.slug, cache);
  }

  return [...mergedBySlug.values()].filter(
    (persona) => persona.syncStatus !== "deleted",
  );
}

export function buildFallbackLocalPersonaCache(
  remote: CloudPersonaSnapshot,
): LocalPersonaCache {
  return buildLocalPersonaCache(remote);
}
