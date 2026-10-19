import { useEffect, useRef, useState } from "react";
import {
  fetchWeather,
  weatherCoordinates,
  WEATHER_REFRESH_MS,
} from "@/weather";

const inactive = { type: "none", status: "idle", message: "Clima pausado" };
const descriptions = {
  rain: "Chuva na região",
  snow: "Neve na região",
  none: "Sem chuva ou neve na região",
};

// Location and cached weather live only in memory for this mounted map.
export function useWeather(enabled) {
  const [state, setState] = useState(inactive);
  const cache = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let coordinates;
    let refreshTimer;
    let timeout;
    let controller;
    let permission;
    let pending = false;
    let nextRefresh = 0;
    const fail = (message) => {
      if (active) setState({ type: "none", status: "error", message });
    };
    const onPermissionChange = () => {
      if (
        permission.state === "granted" ||
        (permission.state === "prompt" && !coordinates)
      )
        return;
      coordinates = null;
      cache.current = null;
      clearTimeout(refreshTimer);
      controller?.abort();
      fail("Localização não autorizada · clima indisponível");
    };
    const refresh = async () => {
      clearTimeout(refreshTimer);
      if (!active || !coordinates || document.hidden || pending) return;
      if (Date.now() < nextRefresh) {
        refreshTimer = setTimeout(refresh, nextRefresh - Date.now());
        return;
      }
      const key = `${coordinates.latitude},${coordinates.longitude}`;
      if (cache.current?.key === key && cache.current.expires > Date.now()) {
        nextRefresh = cache.current.expires;
        setState({
          ...cache.current.weather,
          status: "ready",
          message: descriptions[cache.current.weather.type],
        });
        refreshTimer = setTimeout(refresh, nextRefresh - Date.now());
        return;
      }
      pending = true;
      controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const weather = await fetchWeather(coordinates, {
          signal: controller.signal,
        });
        if (!active || !coordinates) return;
        nextRefresh = Date.now() + WEATHER_REFRESH_MS;
        cache.current = { key, weather, expires: nextRefresh };
        setState({
          ...weather,
          status: "ready",
          message: descriptions[weather.type],
        });
      } catch {
        if (coordinates) fail("Clima indisponível · nova tentativa em 15 min");
        nextRefresh = Date.now() + WEATHER_REFRESH_MS;
      } finally {
        clearTimeout(timeout);
        pending = false;
        if (active && coordinates && !document.hidden)
          refreshTimer = setTimeout(
            refresh,
            Math.max(0, nextRefresh - Date.now()),
          );
      }
    };
    const visibility = () => {
      if (document.hidden) clearTimeout(refreshTimer);
      else refresh();
    };
    setState({
      type: "none",
      status: "locating",
      message: "Permita a localização para mostrar chuva ou neve",
    });
    if (!window.isSecureContext || !navigator.geolocation) {
      fail("Localização indisponível neste navegador");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active || permission?.state === "denied") return;
        try {
          coordinates = weatherCoordinates(position.coords);
        } catch {
          fail("Não foi possível obter a localização");
          return;
        }
        setState({
          type: "none",
          status: "loading",
          message: "Consultando o clima da região…",
        });
        refresh();
      },
      (error) =>
        fail(
          error.code === 1
            ? "Localização não autorizada · clima indisponível"
            : "Não foi possível obter a localização",
        ),
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: WEATHER_REFRESH_MS,
      },
    );
    // Permissions API is optional (geolocation itself remains the source of consent).
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        if (!active) return;
        permission = result;
        permission.addEventListener("change", onPermissionChange);
        onPermissionChange();
      })
      .catch(() => {});
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      clearTimeout(refreshTimer);
      clearTimeout(timeout);
      controller?.abort();
      permission?.removeEventListener("change", onPermissionChange);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled]);
  return enabled ? state : inactive;
}
