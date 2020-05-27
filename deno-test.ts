/* global Deno:readonly */
// @ts-nocheck
import createUse from './index.ts'
Deno.test('type detect works', () => {
  const use = createUse<{}, any>({
    handleObject(emitter: Emitter<EmitMap>, key: string | number, value: any) {},
  })
  use({ foo: n => n })
})
