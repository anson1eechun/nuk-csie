import type { OpenSlideConfig } from '@open-slide/core';

declare const process: { env: Record<string, string | undefined> };

const openSlideConfig: OpenSlideConfig = {
  // GitHub Pages serves a project site from /<repo>/; the deploy workflow sets this.
  base: process.env.OPEN_SLIDE_BASE ?? '/',
};

export default openSlideConfig;
