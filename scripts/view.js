/* jshint bitwise: false, newcap: false, asi: true, eqnull: true, esversion: 6, expr: true */

(() => {
  const OPT_WRAP_SELECTION = true
  const OPT_MOVE_SELECTION = false
  const OPT_TIMER_REFRESH_INTERVAL = 1

  if (OPT_MOVE_SELECTION && !OPT_WRAP_SELECTION) {
    alert('Incorrect configuration: If moving with selection, must also wrap.')
    return
  }

  const SwitchTile = window.SwitchTile
  if (SwitchTile === undefined) {
    return
  }
  const U = SwitchTile.UP_MASK
  const D = SwitchTile.DOWN_MASK
  const L = SwitchTile.LEFT_MASK
  const R = SwitchTile.RIGHT_MASK

  const images = make_images()
  const timer_display = timer_display_controller_factory()

  const inputs = {
    height: document.getElementById('height-input'),
    width: document.getElementById('width-input'),
    size: document.getElementById('size-input')
  }
  const gamediv = document.getElementById('game')
  // const selectiondiv = document.getElementById('selection')
  const selectionlines = {
    left: document.getElementById('left'),
    right: document.getElementById('right'),
    top: document.getElementById('top'),
    bottom: document.getElementById('bottom')
  }
  const style = document.getElementById('dynamic-style')
  const size_style = document.getElementById('size-style')
  let size = 500

  const set_size = to => {
    size = to
    size_style.textContent = (
      '#content{max-width:' + (to + 10) + 'px}' +
      '#game{width:' + to + 'px}' +
      '#selection{width:' + to + 'px}'
    )
  }

  const set_style = (height, width) => {
    // required_width * width + (width + 1) * 5px = size px
    // required_width = (size px - (width + 1) * 5px) / width
    const required_width = (size - (width + 1) * 5) / width
    const div_height = (height * required_width + (height + 1) * 5)
    style.textContent =
      '.switchtile-tile{width:' + required_width + 'px}' +
      '#game{height:' + div_height + 'px}' +
      '#selection{margin-top:-' + div_height + 'px;height:' + div_height + 'px}'
  }

  const draw_game = switchtile => {
    // debugger
    let last_child
    while ((last_child = gamediv.lastChild)) gamediv.removeChild(last_child)
    const fragment = document.createDocumentFragment()
    const height = switchtile.height
    const width = switchtile.width
    const tile_width = (size - (width + 1) * 5) / width
    for (let y = 0; y < height; ++y) {
      const row = switchtile.tiles[y]
      for (let x = 0; x < width; ++x) {
        const tile = images[row[x]]()
        tile.setAttribute('style',
          'top:' + (5 * (y + 1) + tile_width * y) + 'px;left:' +
          (5 * (x + 1) + tile_width * x) + 'px'
        )
        //tile.setAttribute('style', 'top: 5px;left:5px')
        fragment.appendChild(tile)
      }
    }
    gamediv.appendChild(fragment)
  }

  const draw_selection = (selected_y, selected_x, width) => {
    const tile_width = (size - (width + 1) * 5) / width
    const l_offset = 5 * selected_x + tile_width * selected_x
    const t_offset = 5 * selected_y + tile_width * selected_y
    selectionlines.left.style = 'left:' + l_offset + 'px'
    selectionlines.right.style = 'left:' + (l_offset + tile_width) + 'px'
    selectionlines.top.style = 'top:' + t_offset + 'px'
    selectionlines.bottom.style = 'top:' + (t_offset + tile_width) + 'px'
  }

  /*
  const height = 3
  const width = 5
  set_style(height, width)
  const switchtile = new SwitchTile(height, width)
  switchtile.shuffle()
  draw_game(switchtile)
  */

  /*
  for (let i = 1; i <= SwitchTile.ALL_TILE; ++i) {
    document.getElementById('content').appendChild(document.createElement('br'))
    const bits = []
    if (i & U) bits.push('UP')
    if (i & D) bits.push('DOWN')
    if (i & L) bits.push('LEFT')
    if (i & R) bits.push('RIGHT')
    document.getElementById('content').appendChild(document.createTextNode(bits.join(' ')))
    document.getElementById('content').appendChild(document.createElement('br'))
    document.getElementById('content').appendChild(images[i]())
  }
  */

  const game = new SwitchTile(3, 3)
  let selected_y = 0
  let selected_x = 0
  SwitchTile.precache(4, 4)
  SwitchTile.precache(5, 5)

  let in_game = false

  window.b = () => {
    // debugger
    timer_display.stop()
    timer_display.clear()

    const size = +inputs.size.value
    if (size >= 100 && size < 10000000000000000) {
      set_size(size)
    }

    const width = Math.floor(+inputs.width.value || 3)
    const height = Math.floor(+inputs.height.value || width)
    game.reset(height, width)
    selected_y = 0
    selected_x = 0
    in_game = false
    set_style(height, width)
    draw_game(game)
    draw_selection(selected_y, selected_x, width)
  }

  window.s = () => {
    game.shuffle()
    draw_game(game)
  }

  window.b()

  const prevent_all = e => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  const positive_mod = (a, b) => ((a % b) + b) % b

  const keyhandler = e_ => {
    // debugger
    const e = e_ || event
    const is_shift = e.getModifierState('Shift')
    let direction
    switch (event.key) {
      case 'ArrowUp':
        if (is_shift) {
          direction = D
          if (!OPT_MOVE_SELECTION) break
        }
        if (selected_y === 0 && !OPT_WRAP_SELECTION) return prevent_all(e)
        selected_y = positive_mod(selected_y - 1, game.height)
        break
      case 'ArrowLeft':
        if (is_shift) {
          direction = R
          if (!OPT_MOVE_SELECTION) break
        }
        if (selected_x === 0 && !OPT_WRAP_SELECTION) return prevent_all(e)
        selected_x = positive_mod(selected_x - 1, game.width)
        break
      case 'ArrowDown':
        if (is_shift) {
          direction = U
          if (!OPT_MOVE_SELECTION) break
        }
        if (selected_y === game.height - 1 && !OPT_WRAP_SELECTION) return prevent_all(e)
        selected_y = (selected_y + 1) % game.height
        break
      case 'ArrowRight':
        if (is_shift) {
          direction = L
          if (!OPT_MOVE_SELECTION) break
        }
        if (selected_x === game.width - 1 && !OPT_WRAP_SELECTION) return prevent_all(e)
        selected_x = (selected_x + 1) % game.width
        break
      default:
        return
    }
    if (is_shift) {
      if (!in_game) {
        in_game = true
        timer_display.start()
      }
      // debugger
      game.move([selected_x, selected_y], direction)
      // debugger
      if (game.check()) {
        timer_display.stop()
        in_game = false
      }
      draw_game(game)
      if (!OPT_MOVE_SELECTION) return prevent_all(e)
    }
    draw_selection(selected_y, selected_x, game.width)
    return prevent_all(e)
  }

  // document.body.addEventListener('keypress', )
  document.addEventListener('keydown', keyhandler, false)

  function make_images() {
    const svg_ns = 'http://www.w3.org/2000/svg'
    const svg = (...elements) => {
      const svg = document.createElementNS(svg_ns, 'svg')
      svg.setAttribute('version', '1.1')
      svg.setAttribute('baseProfile', 'none')
      svg.setAttribute('xmlns', svg_ns)
      svg.setAttribute('viewBox', '0 0 2 2')
      for (const el of elements) {
        svg.appendChild(el)
      }
      svg.setAttribute('class', 'switchtile-tile')
      return () => svg.cloneNode(true)
    }
    const path = (d, fill = null) => {
      const path = document.createElementNS(svg_ns, 'path')
      path.setAttribute('d', d)
      if (fill != null) {
        path.setAttribute('fill', fill)
      }
      return path
    }
    const make_d = (use_z, start, ...points) => {
      let d = 'M' + start[0] + ' ' + start[1]
      for (const point of points) {
        d += 'L' + point[0] + ' ' + point[1]
      }
      if (use_z) {
        d += 'Z'
      }
      return d
    }
    const rect = (tr_x, tr_y, width, height, fill = null) =>
        path(make_d(true, [tr_x, tr_y], [tr_x + width, tr_y], [tr_x + width, tr_y + height], [tr_x, tr_y + height]), fill)

    const triangle = (a_x, a_y, b_x, b_y, c_x, c_y, fill = null) =>
        path(make_d(true, [a_x, a_y], [b_x, b_y], [c_x, c_y]), fill)

    const UC = '#222222'
    const DC = '#FFFF66'
    const LC = '#4488CC'
    const RC = '#55FF88'

    return {
      [0             ]: svg(rect(0, 0, 2, 2, 'purple')),
      [U             ]: svg(rect(0, 0, 2, 2, UC)),
      [    D         ]: svg(rect(0, 0, 2, 2, DC)),
      [U | D         ]: svg(rect(0, 0, 2, 1, UC), rect(0, 1, 2, 1, DC)),
      [        L     ]: svg(rect(0, 0, 2, 2, LC)),
      [U |     L     ]: svg(triangle(0, 0, 2, 0, 2, 2, UC), triangle(0, 0, 0, 2, 2, 2, LC)),
      [    D | L     ]: svg(triangle(2, 0, 0, 2, 2, 2, DC), triangle(0, 0, 2, 0, 0, 2, LC)),
      [U | D | L     ]: svg(path(make_d(true, [0, 0], [2, 0], [2, 1], [1, 1]), UC), path(make_d(true, [0, 2], [2, 2], [2, 1], [1, 1]), DC), triangle(0, 0, 1, 1, 0, 2, LC)),
      [            R ]: svg(rect(0, 0, 2, 2, RC)),
      [U |         R ]: svg(triangle(0, 0, 2, 0, 0, 2, UC), triangle(2, 0, 0, 2, 2, 2, RC)),
      [    D |     R ]: svg(triangle(0, 0, 0, 2, 2, 2, DC), triangle(0, 0, 2, 0, 2, 2, RC)),
      [U | D |     R ]: svg(path(make_d(true, [0, 0], [2, 0], [1, 1], [0, 1]), UC), path(make_d(true, [2, 2], [0, 2], [0, 1], [1, 1]), DC), triangle(2, 0, 2, 2, 1, 1, RC)),
      [        L | R ]: svg(rect(0, 0, 1, 2, LC), rect(1, 0, 1, 2, RC)),
      [U |     L | R ]: svg(triangle(0, 0, 2, 0, 1, 1, UC), path(make_d(true, [0, 0], [0, 2], [1, 2], [1, 1]), LC), path(make_d(true, [2, 0], [2, 2], [1, 2], [1, 1]), RC)),
      [    D | L | R ]: svg(triangle(0, 2, 2, 2, 1, 1, DC), path(make_d(true, [0, 0], [1, 0], [1, 1], [0, 2]), LC), path(make_d(true, [1, 0], [2, 0], [2, 2], [1, 1]), RC)),
      [U | D | L | R ]: svg(triangle(0, 0, 2, 0, 1, 1, UC), triangle(0, 2, 2, 2, 1, 1, DC), triangle(0, 0, 0, 2, 1, 1, LC), triangle(2, 0, 2, 2, 1, 1, RC))
    }
  }

  function timer_display_controller_factory() {
    const timer = SwitchTile.timer_factory()

    const timer_minute = document.getElementById('timer-minute')
    const timer_colon = document.getElementById('timer-colon')
    const timer_second = document.getElementById('timer-second')
    const timer_ms = document.getElementById('timer-ms')

    const update_time_display = () => {
      const elapsed = timer()
      const minutes = Math.floor(elapsed / 60000)
      const s = Math.floor(elapsed / 1000) % 60
      const ms = ('000' + Math.floor(elapsed % 1000)).slice(-3)

      if (minutes) {
        timer_ms.textContent = ms
        timer_second.textContent = ('0' + s).slice(-2)
        timer_colon.hidden = false
        timer_minute.textContent = minutes
      } else {
        timer_ms.textContent = ms
        timer_second.textContent = s
        timer_colon.hidden = true
        timer_minute.textContent = ''
      }
    }

    let interval_id = null

    return {
      start: (delay = OPT_TIMER_REFRESH_INTERVAL) => {
        timer.reset()
        if (interval_id === null) {
          interval_id = setInterval(update_time_display, delay)
        }
      },
      stop: () => {
        if (interval_id !== null) {
          clearInterval(interval_id)
          interval_id = null
          update_time_display()
        }
      },
      clear: () => {
        timer.reset()
        timer_ms.textContent = '000'
        timer_second.textContent = '0'
        timer_colon.hidden = true
        timer_minute.textContent = ''
      }
    }
  }
})()
