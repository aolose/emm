import { vi } from 'vitest';
import  crypto from 'node:crypto'

vi.stubGlobal('crypto', crypto)


vi.mock('$app/environment', () => ({
    browser: false,
    dev: true,
    prerender: false
}))

