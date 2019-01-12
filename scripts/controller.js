/* jshint bitwise: false, newcap: false, asi: true, eqnull: true, esversion: 6, expr: true */

(() => {
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

  const shuffle_array = (arr, rng = default_rng) => {
    const randint = randint_factory(rng)
    for (let i = arr.length; i-- > 0;) {
      const rand_index = randint(0, i)
      const temp = arr[i]
      arr[i] = arr[rand_index]
      arr[rand_index] = temp
    }
  }

  const rand2dindex_factory = (height, width, rng = default_rng) => {
    const area = height * width
    return (lower = 0, upper = area - 1) => {
      const i = Math.floor(rng() * (upper - lower + 1)) + lower
      return [Math.floor(i / height), i % height]
    }
  }

  const shuffle_2d_array = (arr, rng = default_rng) => {
    const height = arr.length
    if (height === 0) return
    const width = arr[0].length
    const rand2dindex = rand2dindex_factory(height, width, rng)
    for (let i = height * width; i-- > 0;) {
      const y = Math.floor(i / height)
      const x = i % height
      const rand_index = rand2dindex(0, i)
      const rand_y = rand_index[0]
      const rand_x = rand_index[1]
      const temp = arr[y][x]
      arr[y][x] = arr[rand_y][rand_x]
      arr[rand_y][rand_x] = temp
    }
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
      this.tiles = []
      this.reset(height, width);
    }
    reset(height, width) {
      height = Number(height) || this.height
      width = Number(width) || this.width
      if (reset_cache[height] === undefined) {
        reset_cache[height] = []
      } else if (reset_cache[height][width] !== undefined) {
        this.set_to(reset_cache[height][width])
        return
      }
      const tiles = this.tiles = Array
        .apply(null, {length: height})
        .map(() => Array.apply(null, {length: width}).map(() => 0));
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
      this.tiles = tiles
      this.height = height
      this.width = width
      reset_cache[height][width] = this.copy()
    }
    static precache(height, width = height) {
      new this(height, width)
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
      const tiles = this.tiles
      const o_tiles = other.tiles
      let y
      for (y = 0; y < other.height; ++y) {
        if (y >= this.width) {
          tiles[y] = Array(other.width)
        }
        const row = tiles[y]
        const o_row = o_tiles[y]
        let x
        for (x = 0; x < other.width; ++x) {
          row[x] = o_row[x]
        }
        for (; x < this.width; ++x) {
          delete row[x]
        }
        row.length = other.width
      }
      for (; y < this.height; ++y) {
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
      return (new SwitchTile(this.height, this.width)).equals(this)
    }
    // method = null is pure random
    // method = Number is do "method" number of moves
    shuffle(method = 500, rng = default_rng) {
      if (method === null) {
        shuffle_2d_array(this.tiles, rng)
        return this
      } else {
        const rand2dindex = rand2dindex_factory(this.height, this.width, rng)
        const randchoice = randchoice_factory(rng)
        // const randint = randint_factory(rng)

        while (method-- > 0) {
          const source = rand2dindex()
          const direction = randchoice([UP_MASK, DOWN_MASK, LEFT_MASK, RIGHT_MASK])
          this.move(source, direction)
        }
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
    }

    move_right(row, amount = 1) {
      return this.move_left(row, -amount)
    }
  }

  const performance_now = window.performance ? (
    performance.now ? performance.now.bind(performance) :
    performance.webkitNow ? performance.webkitNow.bind(performance) :
    null
  ) : null

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
        offset = 0
        seen = 0
        timer()
      }
      timer.reset()
      return timer
    }
  ) : () => {
    let last
    const timer = () => performance_now() - last
    timer.reset = () => { last = performance_now() }
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
    timer_factory
  })
})();
