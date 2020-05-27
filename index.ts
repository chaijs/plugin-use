interface EventMap {
  [key: string]: any[]
}
type EventHandler<T extends any[]> = (this: void, ...args: T) => any
export interface Emitter<Events extends EventMap> {
  count<K extends keyof Events>(name: K): number
  emit<K extends keyof Events>(name: K, ...args: Events[K]): void
  on<K extends keyof Events>(name: K, handler: EventHandler<Events[K]>): void
  off<K extends keyof Events>(name: K, handler: EventHandler<Events[K]>): void
}

type PluginFunction<T extends EventMap> = (emitter: Emitter<T>) => any

interface UseOptions<T extends EventMap, V> {
  handleObject(emitter: Emitter<T>, key: keyof T, value: V): any
  handleReturn?(emitter: Emitter<T>, value: any): void
  handleEmit?<K extends keyof T>(emitter: Emitter<T>, key: K, ...args: T[K]): boolean
}

export default function createUse<T extends EventMap, V>(options: UseOptions<T, V>) {
  const events: Map<keyof T, Set<EventHandler<T[keyof T]>>> = new Map()
  const backfill: Map<keyof T, Set<T[keyof T]>> = new Map()
  return (pluginFunctionOrObject: PluginFunction<T> | Record<string | number, V>) => {
    const pluginBackfill: Map<keyof T, Set<T[keyof T]>> = new Map(backfill)
    const pluginHandlers: Map<keyof T, Set<EventHandler<T[keyof T]>>> = new Map()
    const emitter: Emitter<T> = {
      count: <K extends keyof T>(name: K): number => (events.has(name) ? events.get(name)!.size : 0),
      on: <K extends keyof T>(name: K, handler: EventHandler<T[K]>) => {
        if (pluginBackfill.has(name)) {
          pluginBackfill.get(name)!.forEach(args => handler(...(args as T[K])))
          pluginBackfill.delete(name)
        }

        if (!events.has(name)) events.set(name, new Set())
        events.get(name)!.add(handler as EventHandler<T[keyof T]>)

        if (!pluginHandlers.has(name)) {
          pluginHandlers.set(name, new Set())
        }
        pluginHandlers.get(name)!.add(handler as EventHandler<T[keyof T]>)
      },

      off: <K extends keyof T>(name: K, handler: EventHandler<T[K]>) => {
        // When removed, an event listener gets removed
        // from both the global event list and its own plugin event list
        if (events.has(name)) events.get(name)!.delete(handler as EventHandler<T[keyof T]>)
        if (pluginHandlers.has(name)) pluginHandlers.get(name)!.delete(handler as EventHandler<T[keyof T]>)
      },

      emit: <K extends keyof T>(name: K, ...args: T[K]) => {
        if (options.handleEmit && options.handleEmit(emitter, name, ...args)) return

        if (events.has(name)) {
          for (const handler of events.get(name)!) {
            if (!pluginHandlers.get(name)?.has(handler)) handler(...args)
          }
        }

        // Every event gets added to the backfill
        if (!backfill.has(name)) backfill.set(name, new Set())
        backfill.get(name)!.add(args)
      },
    }

    if (typeof pluginFunctionOrObject === 'function') {
      const value = pluginFunctionOrObject(emitter)
      if (options.handleReturn) {
        options.handleReturn(emitter, value)
      }
    } else {
      Object.keys(pluginFunctionOrObject).forEach(key =>
        options.handleObject(emitter, key, pluginFunctionOrObject[key])
      )
    }
  }
}
