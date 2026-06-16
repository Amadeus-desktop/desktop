import { useEffect, useMemo, useState } from "react";
import {
  getPersonaList,
  PRESENCE_ICON_BY_PERSONA,
  type LocalPersonaCache,
  type Persona,
  type PersonaId,
} from "../../../domain/persona";
import type { AppLocale } from "../../../i18n/types";
import { listLocalPersonas } from "../../timeline/adapters/timelineRepository";
import { syncCloudPersonasToLocalCache } from "../adapters/personaCacheRepository";

type CachedPersonaState = {
  personas: Persona[];
  loading: boolean;
  error: string | null;
};

export function useCachedPersonas(locale: AppLocale): CachedPersonaState {
  const fallbackPersonas = useMemo(() => getPersonaList(locale), [locale]);
  const [cachedPersonas, setCachedPersonas] = useState<Persona[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const synced = await syncCloudPersonasToLocalCache();
        const source = synced.length ? synced : await listLocalPersonas();
        if (!cancelled && source.length) {
          setCachedPersonas(source.map(localCacheToPersona));
        }
      } catch (loadError) {
        try {
          const local = await listLocalPersonas();
          if (!cancelled && local.length) {
            setCachedPersonas(local.map(localCacheToPersona));
            return;
          }
        } catch {
          // Keep bundled personas when both cloud sync and local cache fail.
        }

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "persona_load_failed",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  return {
    personas: cachedPersonas ?? fallbackPersonas,
    loading,
    error,
  };
}

function localCacheToPersona(cache: LocalPersonaCache): Persona {
  const id = cache.slug as PersonaId;
  return {
    id,
    name: cache.name,
    shortLabel: cache.relationshipType,
    description: cache.worldType,
    icon: PRESENCE_ICON_BY_PERSONA[id] ?? "letter",
  };
}
