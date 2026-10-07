import { useEffect, useRef, useState } from "react";
import type { Encyclopedia, SimulationResult, SpeciesDetail } from "./types";

export type SimRequest = {
  species_ids: string[];
  temperature_c: number;
  water_potential_mpa: number;
  duration_h: number;
  n_points: number;
};

function wsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/api/ws`;
}

export function useSimulation(request: SimRequest): {
  result: SimulationResult | null;
  error: string | null;
} {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socketReady, setSocketReady] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const requestId = useRef(0);
  const requestKey = JSON.stringify(request);

  useEffect(() => {
    const socket = new WebSocket(wsUrl());
    socketRef.current = socket;
    socket.onopen = () => setSocketReady((value) => value + 1);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data as string) as SimulationResult & {
        type: string;
        message?: string;
      };
      if (payload.request_id !== String(requestId.current)) return;
      if (payload.type === "error") {
        setError(payload.message ?? "The simulator rejected that run.");
        return;
      }
      setError(null);
      setResult(payload);
    };
    socket.onclose = () => {
      if (socketRef.current === socket) socketRef.current = null;
    };
    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    const id = String(++requestId.current);
    const body = { type: "simulate", request_id: id, ...request };
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(body));
      return;
    }
    const controller = new AbortController();
    fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `HTTP ${response.status}`);
        }
        return response.json() as Promise<SimulationResult>;
      })
      .then((payload) => {
        if (id !== String(requestId.current)) return;
        setError(null);
        setResult(payload);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (id !== String(requestId.current)) return;
        setError(reason instanceof Error ? reason.message : "Could not reach the simulator.");
      });
    return () => controller.abort();
    // requestKey is the stable serialization of request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, socketReady]);

  return { result, error };
}

export function useEncyclopedia(): Encyclopedia | null {
  const [encyclopedia, setEncyclopedia] = useState<Encyclopedia | null>(null);
  useEffect(() => {
    fetch("/api/encyclopedia")
      .then((response) => response.json())
      .then((payload: Encyclopedia) => setEncyclopedia(payload))
      .catch(() => setEncyclopedia(null));
  }, []);
  return encyclopedia;
}

export function useSpeciesDetail(speciesId: string): SpeciesDetail | null {
  const [detail, setDetail] = useState<SpeciesDetail | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/species/${speciesId}`)
      .then((response) => response.json())
      .then((payload: SpeciesDetail) => {
        if (!cancelled) setDetail(payload);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [speciesId]);
  return detail;
}
