<h1 align=center>plugin-use</h1>
<br>
<p align=center>
  A simple Event Emitter, tuned to be used as a plugin driver.
</p>

<p align=center>
  <a href="./LICENSE">
    <img
      alt="license:mit"
      src="https://img.shields.io/badge/license-mit-green.svg?style=flat-square"
    />
  </a>
  <a href="https://www.npmjs.com/packages/plugin-use">
    <img
      alt="npm:?"
      src="https://img.shields.io/npm/v/plugin-use.svg?style=flat-square"
    />
  </a>
  <a href="https://travis-ci.org/chaijs/plugin-use">
    <img
      alt="build:?"
      src="https://img.shields.io/travis/chaijs/plugin-use/master.svg?style=flat-square"
    />
  </a>
  <a href="https://coveralls.io/r/chaijs/plugin-use">
    <img
      alt="coverage:?"
      src="https://img.shields.io/coveralls/chaijs/plugin-use/master.svg?style=flat-square"
    />
  </a>
  <a href="https://www.npmjs.com/packages/plugin-use">
    <img
      alt="dependencies:?"
      src="https://img.shields.io/npm/dm/plugin-use.svg?style=flat-square"
    />
  </a>
  <a href="">
    <img
      alt="devDependencies:?"
      src="https://img.shields.io/david/chaijs/plugin-use.svg?style=flat-square"
    />
  </a>
  <br>
  <a href="https://chai-slack.herokuapp.com/">
    <img
      alt="Join the Slack chat"
      src="https://img.shields.io/badge/slack-join%20chat-E2206F.svg?style=flat-square"
    />
  </a>
  <a href="https://gitter.im/chaijs/chai">
    <img
      alt="Join the Gitter chat"
      src="https://img.shields.io/badge/gitter-join%20chat-D0104D.svg?style=flat-square"
    />
  </a>
</p>
<div align=center>
  <table width="100%">
  <tr><th colspan=6>Supported Browsers</th></tr> <tr>
  <th align=center><img src="https://camo.githubusercontent.com/ab586f11dfcb49bf5f2c2fa9adadc5e857de122a/687474703a2f2f73766773686172652e636f6d2f692f3278532e737667" alt=""> Chrome</th>
  <th align=center><img src="https://camo.githubusercontent.com/98cca3108c18dcfaa62667b42046540c6822cdac/687474703a2f2f73766773686172652e636f6d2f692f3279352e737667" alt=""> Edge</th>
  <th align=center><img src="https://camo.githubusercontent.com/acdcb09840a9e1442cbaf1b684f95ab3c3f41cf4/687474703a2f2f73766773686172652e636f6d2f692f3279462e737667" alt=""> Firefox</th>
  <th align=center><img src="https://camo.githubusercontent.com/728f8cb0bee9ed58ab85e39266f1152c53e0dffd/687474703a2f2f73766773686172652e636f6d2f692f3278342e737667" alt=""> Safari</th>
  <th align=center><img src="https://camo.githubusercontent.com/96a2317034dee0040d0a762e7a30c3c650c45aac/687474703a2f2f73766773686172652e636f6d2f692f3279532e737667" alt=""> IE</th>
  </tr><tr>
  <td align=center>✅</td>
  <td align=center>✅</td>
  <td align=center>✅</td>
  <td align=center>✅</td>
  <td align=center>9, 10, 11</td>
  </tr>
  </table>
</div>

## What is plugin-use?

"Plugin Use" is a small module which you can use to make a plugin system for a project. It essentially creates an Event Emitter with special properties which make it useful for writing encapsulated plugins:

 - Individual plugins can't subscribe to their own events emitted, only events from other plugins.
 - While each plugin gets its own event emitter, all plugins receive events from other registered plugins.
 - Every emitted event is stored in a buffer, and replayed to newly registered plugins, so they can handle past messages.
 - The central library can mutate any emitted events, allowing it to coerce values or change behaviours (e.g. throw on an `error` event with no listeners).
 - Plugins can also pass a plain object, which the library can decide what to do with.

## Why?

A simple EventEmitter, such as the one provided by default in Node.js is not sufficient for a plugin system as some events need to be special cased.

## Installation

### Node.js

`plugin-use` is available on [npm](http://npmjs.org). To install it, type:

    $ npm install plugin-use

### Deno

`plugin-use` can be imported with the following line:

```js
import createUse from 'https://deno.land/x/plugin_use@v1.0.0/index.ts'
```

## Usage

The primary export of `plugin-use` is the `createUse` function that can gets called by the library that wants a plugin system:

```ts
import createUse from 'plugin-use'

// Create a mapping of well known events and the arguments they have, this will help
// for TypeScript type checking:
interface EmitMap {
  'error': [Error],
  'assert': [boolean],
}

// Create a type which represents the value of each property in the object pattern
type PluginObjectValue = (...args: any[]) => any

const use = createUse<EmitMap, PluginObjectValue>({
  
  // If a plugin is instantiated with a plain object, then `handleObject` is
  // called for each property, allowing you to map them to events to be emitted
  handleObject(emitter: Emitter<EmitMap>, key: string | number, value: PluginObjectValue) {
    emitter.emit(key, value)
  },

  // We can special case some events by using `handleEmit`. Return `true` to
  // mark this event as handled, meaning it won't be emitted by this library.
  handleEmit<K extends keyof EmitMap>(emitter: Emitter<EmitMap>, name: K, ...args: EmitMap[K]): boolean {
    // Throw on an `error` event if there are no listeners for it, just like NodeJS!
    if (name === 'error' && emitter.count('error') === 0) {
      throw args[0]
    }
    // Let this library handle the rest of the events.
    return false
  },

  // If a plugin function returns a value, then `handleReturn` will be called to deal with it.
  handleReturn(emitter: Emitter<EmitMap>, value: any) {
    emitter.emit('assert', value)
  },

})
```
