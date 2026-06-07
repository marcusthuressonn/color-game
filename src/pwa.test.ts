import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const readProjectFile = (relative: string): string =>
  readFileSync(resolve(process.cwd(), relative), 'utf8')

describe('web app manifest', () => {
  test('public/manifest.webmanifest is valid JSON with the installable-PWA fields', () => {
    const text = readProjectFile('public/manifest.webmanifest')
    const manifest = JSON.parse(text) as Record<string, unknown>
    expect(manifest['name']).toBeTruthy()
    expect(manifest['short_name']).toBeTruthy()
    expect(manifest['start_url']).toBe('/')
    expect(manifest['scope']).toBe('/')
    expect(manifest['display']).toBe('standalone')
    expect(manifest['background_color']).toBeTruthy()
    expect(manifest['theme_color']).toBeTruthy()
    const icons = manifest['icons'] as ReadonlyArray<Record<string, unknown>>
    expect(icons.length).toBeGreaterThan(0)
    expect(icons[0]?.['src']).toBeTruthy()
    expect(icons[0]?.['type']).toBeTruthy()
  })

  test('index.html links the manifest and declares theme color + apple touch icon', () => {
    const html = readProjectFile('index.html')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('manifest.webmanifest')
    expect(html).toContain('name="theme-color"')
    expect(html).toContain('rel="apple-touch-icon"')
  })
})

describe('service worker', () => {
  test('public/service-worker.js handles install, activate, and fetch lifecycle events', () => {
    const sw = readProjectFile('public/service-worker.js')
    expect(sw).toContain("addEventListener('install'")
    expect(sw).toContain("addEventListener('activate'")
    expect(sw).toContain("addEventListener('fetch'")
    expect(sw).toMatch(/caches\.open\(/)
    expect(sw).toMatch(/cache\.addAll\(/)
  })

  test('entry.ts registers the service worker after the page loads', () => {
    const entry = readProjectFile('src/entry.ts')
    expect(entry).toContain('navigator.serviceWorker.register')
    expect(entry).toContain('/service-worker.js')
  })
})

describe('layout & tap targets', () => {
  test('styles.css gives Tiles a comfortable minimum tap size (>= 44px)', () => {
    const css = readProjectFile('src/styles.css')
    const tileBlock = css.match(/\.tile\s*\{([^}]*)\}/)?.[1]
    expect(tileBlock, '.tile rule missing from styles.css').toBeTruthy()
    const minHeightRem = tileBlock?.match(/min-height:\s*([0-9.]+)rem/)?.[1]
    expect(minHeightRem, '.tile must declare a rem-based min-height').toBeTruthy()
    expect(parseFloat(minHeightRem ?? '0')).toBeGreaterThanOrEqual(2.75)
    expect(tileBlock).toMatch(/touch-action:\s*manipulation/)
  })

  test('styles.css keeps the app centered with a responsive max-width', () => {
    const css = readProjectFile('src/styles.css')
    const appBlock = css.match(/\.app\s*\{([^}]*)\}/)?.[1]
    expect(appBlock, '.app rule missing from styles.css').toBeTruthy()
    expect(appBlock).toMatch(/max-width:/)
    expect(appBlock).toMatch(/margin:/)
    expect(appBlock).toMatch(/box-sizing:\s*border-box/)
  })

  test('styles.css scales padding down for narrow viewports', () => {
    const css = readProjectFile('src/styles.css')
    expect(css).toMatch(/@media\s*\(max-width:\s*\d+px\)/)
  })
})
