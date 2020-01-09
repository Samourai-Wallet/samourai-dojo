/*!
 * lib/util.js
 * Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 */
'use strict'

/**
 * Class providing utility functions as static methods
 */
class Util {

  /**
   * Constructor
   */
  constructor() {}

  /**
   * Topological ordering of DAG
   * https://en.wikipedia.org/wiki/Topological_sorting
   *
   * Kahn's algorithm
   *
   * L ← Empty list that will contain the sorted elements
   * S ← Set of all nodes with no incoming edge
   * while S is non-empty do
   *   remove a node n from S
   *   add n to tail of L
   *   for each node m with an edge e from n to m do
   *     remove edge e from the graph
   *     if m has no other incoming edges then
   *       insert m into S
   *
   * @param {object} parents - map of {[key]: [incoming edge keys]}
   * @param {object} children - a map of {[key]: [outgoing edge keys]}
   * @returns {object} 
   *    if graph has edges then
   *      return error (graph has at least one cycle)
   *    else 
   *    return L (a topologically sorted order)
   */
  static topologicalOrdering(parents, children) {
    const S = []

    for (let node in parents) {
      if (parents[node].length == 0) {
        // Node has no parent (incoming edges)
        S.push(node)
      }
    }

    const L = []

    while (S.length > 0) {
      const node = S.pop()
      L.push(node)

      // Loop over nodes that depend on node
      for (let child of children[node]) {
        let i = parents[child].indexOf(node)
        if (i > -1)
          parents[child].splice(i, 1)

        if (parents[child].length == 0)
          S.push(child)
      }
    }
    return L
  }

  /**
   * Serialize a series of asynchronous calls to a function
   * over a list of objects
   * ref: http://www.joezimjs.com/javascript/patterns-asynchronous-programming-promises/
   */
  static seriesCall(list, fn) {
    const results = []

    return list.reduce((memo, item) => {
        return memo.then(() => {
          return fn(item)
        }).then(result => {
          results.push(result)
        })
      }, 
      Promise.resolve()
    ).then(function() {
      return results
    })
  }

  /**
   * Delay the call to a function
   */
  static delay(ms, v) {
    return new Promise(resolve => {
      setTimeout(resolve.bind(null, v), ms)
    })
  }

  /**
   * Splits a list into a list of lists each with maximum length LIMIT
   */
  static splitList(list, limit) {
    if (list.length <= limit)
      return [list]

    const lists = []
    while (list.length) {
      lists.push(list.splice(0, limit))
    }
    return lists
  }

  /**
   * Check if a string is a valid hex value
   */
  static isHashStr(hash) {
    const hexRegExp = new RegExp(/^[0-9a-f]*$/, 'i')
    return (typeof hash !== "string") ? false : hexRegExp.test(hash)
  }

  /**
   * Check if a string is a well formed 256 bits hash
   */
  static is256Hash(hash) {
    return Util.isHashStr(hash) && hash.length == 64
  }


  /**
   * Reverse buffer content (swap endiannes)
   */
  static reverseBuffer(buffer) {
    if (buffer.length < 1)
      return buffer

    let j = buffer.length - 1
    let tmp = 0

    for (let i = 0; i < buffer.length / 2; i++) {
      tmp = buffer[i]
      buffer[i] = buffer[j]
      buffer[j] = tmp
      j--
    }

    return buffer
  }

  /**
   * Sum an array of values
   */
  static sum(arr) {
    return arr.reduce((memo, val) => { return memo + val }, 0)
  }

  /**
   * Mean of an array of values
   */
  static mean(arr) {
    if (arr.length == 0)
      return NaN
    return sum(arr) / arr.length
  }

  /**
   * Compare 2 values (asc order)
   */
  static cmpAsc(a, b) {
    return a - b
  }

  /**
   * Compare 2 values (desc order)
   */
  static cmpDesc(a,b) {
    return b - a
  }

  /**
   * Median of an array of values
   */ 
  static median(arr, sorted) {
    if (arr.length == 0) return NaN
    if (arr.length == 1) return arr[0]

    if (!sorted)
      arr.sort(Util.cmpAsc)
    
    const midpoint = Math.floor(arr.length / 2)
    
    if (arr.length % 2) {
      // Odd-length array
      return arr[midpoint]
    } else {
      // Even-length array
      return (arr[midpoint-1] + arr[midpoint]) /  2.0
    }
  }

  /**
   * Median Absolute Deviation of an array of values
   */
  static mad(arr, sorted) {
    const med = Util.median(arr, sorted)
    // Deviations from the median
    const dev = []
    for (let val of arr)
      dev.push(Math.abs(val - med))
    return Util.median(dev)
  }

  /**
   * Quartiles of an array of values
   */
  static quartiles(arr, sorted) {
    const q = [NaN,NaN,NaN]

    if (arr.length < 3) return q

    if (!sorted)
      arr.sort(Util.cmpAsc)

    // Set median
    q[1] = Util.median(arr, true)

    const midpoint = Math.floor(arr.length / 2)

    if (arr.length % 2) {
      // Odd-length array
      const mod4 = arr.length % 4
      const n = Math.floor(arr.length / 4)

      if (mod4 == 1) {
        q[0] = (arr[n-1] + 3 * arr[n]) / 4
        q[2] = (3 * arr[3*n] + arr[3*n+1]) / 4
      } else if (mod4 == 3) {
        q[0] = (3 * arr[n] + arr[n+1]) / 4
        q[2] = (arr[3*n+1] + 3 * arr[3*n+2]) / 4
      }

    } else {
      // Even-length array. Slices are already sorted
      q[0] = Util.median(arr.slice(0, midpoint), true)
      q[2] = Util.median(arr.slice(midpoint), true)
    }

    return q
  }

  /**
   * Obtain the value of the PCT-th percentile, where PCT on [0,100]
   */
  static percentile(arr, pct, sorted) {
    if (arr.length < 2) return NaN

    if (!sorted)
      arr.sort(Util.cmpAsc)

    const N = arr.length
    const p = pct/100.0

    let x // target rank

    if (p <= 1 / (N + 1)) {
      x = 1
    } else if (p < N / (N + 1)) {
      x = p * (N + 1)
    } else {
      x = N
    }

    // "Floor-x"
    const fx = Math.floor(x) - 1
    
    // "Mod-x"
    const mx = x % 1
    
    if (fx + 1 >= N) {
      return arr[fx]
    } else {
      // Linear interpolation between two array values
      return arr[fx] + mx * (arr[fx+1] - arr[fx])
    }
  }

  /**
   * Convert bytes to Mb
   */
  static toMb(bytes) {
    return +(bytes / Util.MB).toFixed(0)
  }

  /**
   * Convert a date to a unix timestamp
   */
  static unix() {
    return (Date.now() / 1000) | 0
  }

  /**
   * Convert a value to a padded string (10 chars)
   */
  static pad10(v) {
    return (v < 10) ? `0${v}` : `${v}`
  }

  /**
   * Convert a value to a padded string (100 chars)
   */
  static pad100(v) {
    if (v < 10) return `00${v}`
    if (v < 100) return `0${v}`
    return `${v}`
  }

  /**
   * Convert a value to a padded string (1000 chars)
   */
  static pad1000(v) {
    if (v < 10) return `000${v}`
    if (v < 100) return `00${v}`
    if (v < 1000) return `0${v}`
    return `${v}`
  }

  /**
   * Left pad
   */
  static leftPad(number, places, fill) {
    number = Math.round(number)
    places = Math.round(places)
    fill = fill || ' '

    if (number < 0) return number

    const mag = (number > 0) ? (Math.floor(Math.log10(number)) + 1) : 1
    const parts = []

    for(let i=0; i < (places - mag); i++) {
      parts.push(fill)
    }

    parts.push(number)
    return parts.join('')
  }

  /**
   * Display a time period, in seconds, as DDD:HH:MM:SS[.MS]
   */
  static timePeriod(period, milliseconds) {
    milliseconds = !!milliseconds

    const whole = Math.floor(period)
    const ms = 1000*(period - whole)
    const s = whole % 60
    const m = (whole >= 60) ? Math.floor(whole / 60) % 60 : 0
    const h = (whole >= 3600) ? Math.floor(whole / 3600) % 24 : 0
    const d = (whole >= 86400) ? Math.floor(whole / 86400) : 0

    const parts = [Util.pad10(h), Util.pad10(m), Util.pad10(s)]

    if (d > 0) 
      parts.splice(0, 0, Util.pad100(d))

    const str = parts.join(':')

    if (milliseconds) {
      return str + '.' + Util.pad100(ms)
    } else {
      return str
    }
  }

}

/**
 * 1Mb in bytes
 */
Util.MB = 1024*1024


module.exports = Util
