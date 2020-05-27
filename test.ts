/* eslint-disable max-nested-callbacks */
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import createUse from './index'
type Emitter<T> = import('./index').Emitter<T>

interface EmitMap {
  foo: [any]
  [key: string]: any[]
}

describe('createUse', () => {
  describe('when given object', () => {
    it('calls `handleObject` for each key/value of the object', () => {
      const handleCalls: { key: string | number; value: any }[] = []
      const use = createUse<EmitMap, any>({
        handleObject(emitter: Emitter<EmitMap>, key: string | number, value: any) {
          handleCalls.push({ key, value })
        },
      })

      /* eslint-disable id-length, no-empty-function */
      const a = () => {}
      const b = () => {}
      const c = () => {}
      /* eslint-enable */
      use({ a, b, c })

      expect(handleCalls).to.deep.equal([
        { key: 'a', value: a },
        { key: 'b', value: b },
        { key: 'c', value: c },
      ])
    })
  })

  describe('when given a function', () => {
    let use = createUse<EmitMap, any>({
      handleObject(emitter: Emitter<EmitMap>, key: string | number, value: any) {},
    })
    beforeEach(() => {
      use = createUse<EmitMap, any>({
        handleObject(emitter: Emitter<EmitMap>, key: string | number, value: any) {},
      })
    })

    it('immediately calls the given callback', done => {
      use(() => done())
    })

    it('calls optional `handleReturn` with the functions return value', () => {
      let handledValue: any
      const use = createUse<EmitMap, any>({
        handleObject(emitter: Emitter<EmitMap>, key: string | number, value: any) {},
        handleReturn(emitter: Emitter<EmitMap>, value: any) {
          handledValue = value
        },
      })
      const returnValue = {}
      use(emitter => returnValue)
      expect(handledValue).to.equal(returnValue)
    })

    describe('on', () => {
      it('can be used to listen to events from other plugins', () => {
        let value = null
        let listened = 0
        use(({ on }) => {
          on('foo', emitted => {
            value = emitted
            listened += 1
          })
        })
        const emitValue = {}
        use(({ emit }) => {
          emit('foo', emitValue)
        })
        expect(value).to.equal(emitValue)
        expect(listened).to.equal(1)
      })

      it('backfills events from previously loaded plugins', () => {
        let listened = 0
        const values: any[] = []
        use(({ emit }) => {
          emit('foo', 1)
          emit('foo', 2)
          emit('foo', 3)
        })
        use(({ on }) => {
          on('foo', value => {
            listened += 1
            values.push(value)
          })
        })
        expect(listened).to.equal(3)
        expect(values).to.deep.equal([1, 2, 3])
      })

      it('cannot listen to its own events', () => {
        let listened = 0
        use(({ on, emit }) => {
          on('foo', () => {
            listened += 1
          })
          emit('foo', 1)
          emit('foo', 2)
          emit('foo', 3)
          emit('foo', 4)
        })
        expect(listened).to.equal(0)
      })

      it('cannot listen to its own events even with multiple listeners', () => {
        let listened = 0
        use(({ on, emit }) => {
          on('foo', () => {
            listened += 1
          })
          on('foo', () => {
            listened += 1
          })
          emit('foo', 1)
          emit('foo', 2)
          emit('foo', 3)
          emit('foo', 4)
        })
        expect(listened).to.equal(0)
      })
    })

    describe('off', () => {
      it('stops a listener being called for an event', () => {
        let listened = 0
        use(({ on, off }) => {
          const listener = () => {
            listened += 1
            off('foo', listener)
          }
          on('foo', listener)
        })
        use(({ emit }) => {
          emit('foo', 1)
          emit('foo', 2)
          emit('foo', 3)
          emit('foo', 4)
        })
        expect(listened).to.equal(1)
      })

      it('does not throw even when trying to turn off an event that has not been added', () => {
        expect(() => {
          use(({ off }) => {
            // @ts-ignore
            off('foo')
            off('foo', () => {})
          })
        }).to.not.throw()
      })
    })

    describe('emit', () => {
      it('calls handleEmit if available, for each emitted event', () => {
        const emitted: { name: any; args: any }[] = []
        const use = createUse<EmitMap, any>({
          handleObject(emitter: Emitter<EmitMap>, key: string | number, value: any) {},
          handleEmit<K extends keyof EmitMap>(emitter: Emitter<EmitMap>, name: K, ...args: EmitMap[K]): boolean {
            emitted.push({ name, args })
            return false
          },
        })
        use(({ emit }) => {
          emit('foo', 1)
          emit('foo', 2)
          emit('foo', 3)
        })
        expect(emitted).to.deep.equal([
          { name: 'foo', args: [1] },
          { name: 'foo', args: [2] },
          { name: 'foo', args: [3] },
        ])
      })

      it('does not emit if handleEmit returned true', () => {
        const use = createUse<EmitMap, any>({
          handleObject(emitter: Emitter<EmitMap>, key: string | number, value: any) {},
          handleEmit<K extends keyof EmitMap>(emitter: Emitter<EmitMap>, name: K, ...args: EmitMap[K]): boolean {
            if (args[0] === 2) return true
            return false
          },
        })
        const values: any[] = []
        use(({ on }) => {
          on('foo', (n: any) => values.push(n))
        })
        use(({ emit }) => {
          emit('foo', 1)
          emit('foo', 2)
          emit('foo', 3)
        })
        expect(values).to.deep.equal([1, 3])
      })
    })

    describe('count', () => {
      it('gets the count of all registered listeners', () => {
        use(({ on }) => {
          on('foo', () => {})
        })
        use(({ on }) => {
          on('foo', () => {})
        })
        let fooCount = NaN
        let barCount = NaN
        use(({ on, count }) => {
          on('foo', () => {})
          fooCount = count('foo')
          barCount = count('bar')
        })
        expect(fooCount).to.equal(3)
        expect(barCount).to.equal(0)
      })
    })
  })
})
