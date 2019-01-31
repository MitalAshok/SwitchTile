/* jshint bitwise: false, newcap: false, asi: true, eqnull: true, esversion: 6, expr: true */

; (() => {
  const UP_MASK = 1
  const DOWN_MASK = 2
  const LEFT_MASK = 4
  const RIGHT_MASK = 8

  const UP_TILE = UP_MASK
  const LEFT_TILE = LEFT_MASK
  const DOWN_TILE = DOWN_MASK
  const RIGHT_TILE = RIGHT_MASK

  const UP_LEFT_TILE = UP_MASK | LEFT_MASK
  const UP_RIGHT_TILE = UP_MASK | RIGHT_MASK
  const DOWN_LEFT_TILE = DOWN_MASK | LEFT_MASK
  const DOWN_RIGHT_TILE = DOWN_MASK | RIGHT_MASK

  const ALL_TILE = UP_MASK | LEFT_MASK | DOWN_MASK | RIGHT_MASK

  // These next 6 not seen in square switchtiles

  const UP_DOWN_TILE = UP_MASK | DOWN_MASK
  const LEFT_RIGHT_TILE = LEFT_MASK | RIGHT_MASK

  const UP_DOWN_LEFT_TILE = UP_MASK | DOWN_MASK | LEFT_MASK
  const UP_DOWN_RIGHT_TILE = UP_MASK | DOWN_MASK | RIGHT_MASK
  const UP_LEFT_RIGHT_TILE = UP_MASK | LEFT_MASK | RIGHT_MASK
  const DOWN_LEFT_RIGHT_TILE = DOWN_MASK | LEFT_MASK | RIGHT_MASK

  // Utility functions

  const default_rng = Math.random.bind(Math)
  // randint()(a, b) returns an int in [a, b] (inclusive)
  const randint_factory = (rng = default_rng) => (lower, upper) => Math.floor(rng() * (upper - lower + 1)) + lower
  const randchoice_factory = (rng = default_rng) => arr => arr[randint_factory(rng)(0, arr.length - 1)]

  // Returns number of swaps done
  const shuffle_array = (arr, rng = default_rng) => {
    let n_swaps = 0
    const randint = randint_factory(rng)
    for (let i = arr.length; i-- > 0;) {
      const rand_index = randint(0, i)
      if (rand_index !== i) {
        const temp = arr[i]
        arr[i] = arr[rand_index]
        arr[rand_index] = temp
        ; ++n_swaps
      }
    }
    return n_swaps
  }

  const rand2dindex_factory = (height, width, rng = default_rng) => {
    const area = height * width
    return (lower = 0, upper = area - 1) => {
      const i = Math.floor(rng() * (upper - lower + 1)) + lower
      return [Math.floor(i / width), i % width]
    }
  }

  const shuffle_2d_array = (arr, height, width, rng = default_rng) => {
    if (height === 0) return 0
    const rand2dindex = rand2dindex_factory(height, width, rng)
    let n_swaps = 0
    for (let i = height * width; i-- > 0;) {
      const y = Math.floor(i / width)
      const x = i % width
      const rand_index = rand2dindex(0, i)
      const rand_y = rand_index[0]
      const rand_x = rand_index[1]
      if (rand_y !== y || rand_x !== x) {
        const temp = arr[y][x]
        arr[y][x] = arr[rand_y][rand_x]
        arr[rand_y][rand_x] = temp
        ; ++n_swaps
      }
    }
    return n_swaps
  }

  const positive_mod = (a, b) => ((a % b) + b) % b

  const reset_cache = []

  class SwitchTile {
    constructor(height, width) {
      if (width === undefined) {
        if (height instanceof SwitchTile) {
          this.set_to(height)
          return
        }
        width = height
      }
      this.width = 0
      this.height = 0
      this.tiles = null
      this.reset(height, width)
    }
    reset(height, width) {
      height = Number(height) || this.height
      width = Number(width) || this.width
      SwitchTile.precache(height, width)
      this.set_to(reset_cache[height][width])
    }
    static precache(height, width = height) {
      height = +height
      width = +width
      if (
        typeof height !== 'number' || height < 0 ||
        !Number.isSafeInteger(height) ||
        typeof width !== 'number' || width < 0 ||
        !Number.isSafeInteger(width) ||
        !Number.isSafeInteger(height * width)
      ) {
        height = width = 3
      }
      if (reset_cache[height] === undefined) {
        reset_cache[height] = []
      } else if (reset_cache[height][width] !== undefined) {
        return SwitchTile
      }
      const tiles = Array
        .apply(null, {length: height})
        .map(() => Array.apply(null, {length: width}).map(() => 0))
      for (let y = 0; y < height / 2; ++y) {
        for (let x = y; x < width - y; ++x) {
          tiles[y][x] |= UP_MASK
        }
      }
      for (let y = (height - height % 2) / 2; y < height; ++y) {
        for (let x = height - y - 1; x < width - height + y + 1; ++x) {
          tiles[y][x] |= DOWN_MASK
        }
      }
      for (let x = 0; x < width / 2; ++x) {
        for (let y = x; y < height - x; ++y) {
          tiles[y][x] |= LEFT_MASK
        }
      }
      for (let x = (width - width % 2) / 2; x < width; ++x) {
        for (let y = width - x - 1; y < height - width + x + 1; ++y) {
          tiles[y][x] |= RIGHT_MASK
        }
      }
      const cached = Object.create(SwitchTile.prototype)
      cached.tiles = tiles
      cached.height = height
      cached.width = width
      reset_cache[height][width] = cached
      return SwitchTile
    }
    copy() {
      const copy = Object.create(SwitchTile.prototype)
      const height = copy.height = this.height
      const width = copy.width = this.width
      const tiles = Array(height)
      const o_tiles = this.tiles
      for (let y = 0; y < height; ++y) {
        const row = tiles[y] = Array(width)
        const o_row = o_tiles[y]
        for (let x = 0; x < width; ++x) {
          row[x] = o_row[x]
        }
      }
      copy.tiles = tiles
      return copy
    }
    set_to(other) {
      const tiles = this.tiles || (this.tiles = Array(other.height))
      const o_tiles = other.tiles
      let y
      for (y = 0; y < other.height; ++y) {
        const row = tiles[y] || (tiles[y] = Array(other.width))
        const o_row = o_tiles[y]
        let x
        for (x = 0; x < other.width; ++x) {
          row[x] = o_row[x]
        }
        for (; x < row.length; ++x) {
          delete row[x]
        }
        row.length = other.width
      }
      for (; y < tiles.length; ++y) {
        delete tiles[y]
      }
      tiles.length = other.height
      this.width = other.width
      this.height = other.height
      return this
    }
    equals(other) {
      if (this.width != other.width || this.height != other.height) {
        return false
      }
      for (let y = 0; y < this.height; ++y) {
        for (let x = 0; x < this.width; ++x) {
          if (this.tiles[y][x] != other.tiles[y][x]) {
            return false
          }
        }
      }
      return true
    }
    check() {
      SwitchTile.precache(this.height, this.width)
      return reset_cache[this.height][this.width].equals(this)
    }
    // method = null is pure random
    // method = Number is do "method" number of moves
    swap(times = 1, rng = default_rng) {
      const height = this.height
      const width = this.width
      const tiles = this.tiles
      const rand2dindex = rand2dindex_factory(height, width, rng)
      while (times-- > 0) {
        const first = rand2dindex(0, height * width - 1)
        const second = rand2dindex(0, height * width - 2)
        if (second[0] > first[0] || (second[0] == first[0] && second[1] >= second[1])) {
          // Increment second by 1
          ; ++second[1]
          if (second[1] === width) {
            second[1] = 0
            ; ++second[0]
          }
        }
        const temp = tiles[first[0]][first[1]]
        tiles[first[0]][first[1]] = tiles[second[0]][second[1]]
        tiles[second[0]][second[1]] = temp
      }
    }
    shuffle(method = null, rng = default_rng) {
      if (method === null) {
        const height = this.height
        const width = this.width
        const tiles = this.tiles
        if (height === 0 || width === 0) return this
        if (height === 1 || width === 1) {
          if (height === width) return this
          const direction = height === 1 ? LEFT_MASK : UP_MASK
          const amount = randint_factory(rng)(0, Math.max(height, width) - 1)
          this.move([0, 0], direction, amount)
          return this
        }
        const parity = shuffle_2d_array(tiles, height, width, rng) % 2
        if (height === 3 && width === 3 && parity === 1) {
          /*
          // Parity correction; Swap 1 more to have an even parity
          const rand2dindex = rand2dindex_factory(height, width, rng)
          const first = rand2dindex(0, height * width - 1)
          const second = rand2dindex(0, height * width - 2)
          if (second[0] > first[0] || (second[0] == first[0] && second[1] >= second[1])) {
            // Increment second by 1
            ; ++second[1]
            if (second[1] === width) {
              second[1] = 0
              ; ++second[0]
            }
          }
          const temp = tiles[first[0]][first[1]]
          tiles[first[0]][first[1]] = tiles[second[0]][second[1]]
          tiles[second[0]][second[1]] = temp
          */
          this.swap(1, rng)
        }
        return this
      } else {
        const shuffle = this.get_shuffler(rng)
        while (method-- > 0) {
          shuffle()
        }
        return this
      }
    }
    get_shuffler(rng = default_rng) {
      const rand2dindex = rand2dindex_factory(this.height, this.width, rng)
      const randchoice = randchoice_factory(rng)
      return () => {
        const source = rand2dindex()
        const direction = randchoice([UP_MASK, DOWN_MASK, LEFT_MASK, RIGHT_MASK])
        this.move(source, direction)
      }
    }
    move(source, direction, amount = 1) {
      const source_col_num = source[0]
      const source_row_num = source[1]
      const method_mapping = {
        [UP_MASK]: SwitchTile.prototype.move_up,
        [DOWN_MASK]: SwitchTile.prototype.move_down,
        [LEFT_MASK]: SwitchTile.prototype.move_left,
        [RIGHT_MASK]: SwitchTile.prototype.move_right
      }
      const source_mapping = {
        [UP_MASK]: source_col_num,
        [DOWN_MASK]: source_col_num,
        [LEFT_MASK]: source_row_num,
        [RIGHT_MASK]: source_row_num
      }
      const method = method_mapping[direction]
      if (method === undefined) throw TypeError('move(source, direction, amount): "direction" must be UP_MASK, DOWN_MASK, LEFT_MASK or RIGHT_MASK, not (' + (typeof(direction)) + ') ' + direction)
      return method.call(this, source_mapping[direction], amount)
    }

    move_up(col, amount = 1) {
      const height = this.height
      const r = this.tiles
      const copy = Array(height)
      for (let i = 0; i < height; ++i) {
        copy[i] = r[i][col]
      }
      amount = positive_mod(-amount, height)
      for (let i = 0; i < height; ++i) {
        r[i][col] = copy[(i + amount) % height]
      }
      return this
    }

    move_down(col, amount = 1) {
      return this.move_up(col, -amount)
    }

    move_left(row, amount = 1) {
      const r = this.tiles[row]
      const width = this.width
      const copy = r.slice()
      amount = positive_mod(-amount, width)
      for (let i = 0; i < width; ++i) {
        r[i] = copy[(i + amount) % width]
      }
      return this
    }

    move_right(row, amount = 1) {
      return this.move_left(row, -amount)
    }
    serialise() {
      const width = this.width
      const height = this.height
      const tiles = this.tiles
      const serialised = Array(height + 1)
      serialised[0] = width + ';'
      for (let y = 0; y < height; ++y) {
        const row = tiles[y]
        const serialised_row = []
        for (let x = 0; x < width; ++x) {
          const byte = (row[x] << 4) | row[++x]
          serialised_row.push(String.fromCharCode(byte))
        }
        serialised.push(serialised_row.join(''))
      }
      return btoa(serialised.join('')).replace(/\//g, '_').replace(/\+/g, '-').replace(/={1,2}$/, '')
    }
    static deserialise(serialised) {
      if (typeof serialised !== 'string') {
        return null
      }
      let raw
      // Invalid characters exist
      if (/[^a-zA-Z0-9_\-]/.test(serialised)) {
        return null
      }
      // Cannot have base 64 string with this length
      if (serialised.length % 4 == 1) {
        return null
      }
      // Re add padding
      if (serialised.length % 4) {
        serialised += '==='.slice(0, 4 - (serialised.length % 4))
      }
      raw = atob(serialised.replace(/_/g, '/').replace(/-/g, '+'))
      const seperator_index = raw.indexOf(';')
      if (seperator_index === -1) {
        return null
      }
      const width_str = raw.slice(0, seperator_index)
      const bytes = raw.slice(seperator_index + 1)
      if (!/[1-9][0-9]*/.test(width_str)) {
        return null
      }
      const width = +width_str
      if (!Number.isSafeInteger(width)) {
        return null
      }
      const width_bytes_length = (width + width % 2) / 2
      if (bytes.length % width_bytes_length !== 0) {
        return null
      }
      const height = bytes.length / width_bytes_length
      if (!Number.isSafeInteger(height) || !Number.isSafeInteger(height * width)) {
        return null
      }
      const tiles = Array(height)
      for (let y = 0; y < height; ++y) {
        const row = tiles[y] = Array(width)
        let x
        for (x = 0; x < width - 2; ++x) {
          const byte = bytes.charCodeAt(y * width_bytes_length + x / 2)
          row[x] = byte >> 4
          row[++x] = byte & 0xF
        }
        const byte = bytes.charCodeAt(y * width_bytes_length + x / 2)
        row[x] = byte >> 4
        if (++x < width) {
          row[x] = byte & 0xF
        }
      }
      const o = Object.create(SwitchTile.prototype)
      o.height = height
      o.width = width
      o.tiles = tiles
      return o
    }
    deserialise(serialised) {
      const deserialised = SwitchTile.deserialise(serialised)
      if (deserialised === null) {
        return null
      }
      this.set_to(deserialised)
      return this
    }
  }

  const performance_now = window.performance ?
      (performance_now => performance_now && performance_now.bind(performance))(
        performance.now ||
        performance.webkitNow ||
        performance.msNow ||
        performance.oNow ||
        performance.mozNow ||
        null
      ) :
      null

  // timer_factroy returns a function
  // Successive calls to the function will
  // return the milliseconds elapsed since the first call
  // in milliseconds.

  // The reset property is a function that, when
  // called, will reset the timer (As if timer_factory
  // was called again)
  const timer_factory = performance_now === null ? (
    () => {
      let offset
      let seen
      const timer = () => {
        let t = Date.now()
        if (t < seen) {
          offset += seen - t
        }
        seen = t
        return t + offset
      }
      timer.reset = () => {
        offset = -Date.now()
        seen = -Infinity
        timer()
      }
      timer.set = (to = 0) => {
        offset = to - Date.now()
        seen = -Infinity
        timer()
      }
      timer.reset()
      return timer
    }
  ) : () => {
    let last
    const timer = () => performance_now() - last
    timer.reset = () => { last = performance_now() }
    timer.set = (to = 0) => { last = performance_now() - to }
    timer.reset()
    return timer
  }

  window.SwitchTile = Object.assign(SwitchTile, {
    UP_MASK, DOWN_MASK, LEFT_MASK, RIGHT_MASK,
    UP_TILE, DOWN_TILE, LEFT_TILE, RIGHT_TILE,
    UP_LEFT_TILE, UP_RIGHT_TILE, DOWN_LEFT_TILE, DOWN_RIGHT_TILE,
    ALL_TILE,
    UP_DOWN_TILE, LEFT_RIGHT_TILE,
    UP_DOWN_LEFT_TILE, UP_DOWN_RIGHT_TILE, UP_LEFT_RIGHT_TILE, DOWN_LEFT_RIGHT_TILE,

    default_rng,
    timer_factory,
    randint_factory,
    randchoice_factory,
    shuffle_array,
    rand2dindex_factory,
    shuffle_2d_array,
    positive_mod
  })
})();
