/** Verify repository identity independently of GitHub's supported Git transports. */
export function isOfficialBiboOrigin(origin: string): boolean {
  try {
    const url = new URL(origin.replace(/^git@github\.com:/i, "ssh://git@github.com/"));
    if (url.password || url.search || url.hash || !/^\/Peiiii\/bibo(?:\.git)?$/i.test(url.pathname)) return false;
    if (url.protocol === "https:") return url.hostname === "github.com" && !url.username && !url.port;
    return url.protocol === "ssh:" && url.username === "git" && ["github.com", "ssh.github.com"].includes(url.hostname)
      && ["", "22", "443"].includes(url.port);
  } catch { return false; }
}
