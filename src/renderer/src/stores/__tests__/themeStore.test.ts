import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore, initTheme } from "../themeStore";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("light");
  useThemeStore.setState({ theme: "dark" });
});

describe("themeStore", () => {
  it("defaults to dark", () => {
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("toggleTheme switches to light and applies the class", () => {
    useThemeStore.getState().toggleTheme();

    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(window.localStorage.getItem("app.theme")).toBe("light");
  });

  it("toggleTheme switches back to dark and removes the class", () => {
    useThemeStore.setState({ theme: "light" });
    document.documentElement.classList.add("light");

    useThemeStore.getState().toggleTheme();

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("setTheme persists and applies the theme", () => {
    useThemeStore.getState().setTheme("light");

    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(window.localStorage.getItem("app.theme")).toBe("light");
  });

  it("initTheme reads the persisted theme and applies it", () => {
    window.localStorage.setItem("app.theme", "light");

    expect(initTheme()).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
