/* jshint bitwise: false, newcap: false, asi: true, eqnull: true, esversion: 6, expr: true */

(() => {
  const SwitchTile = window.SwitchTile

  if (SwitchTile === undefined) {
    return
  }

  const get_search_key = (location.search === '' || location.search === '?') ? (key => undefined) : (() => {
    const search = location.search.slice(1).split('&')
    const mapped = search.reduce(((acc, cur) => {
      const split_index = cur.indexOf('=')
      if (split_index === -1) {
        const key = decodeURIComponent(cur)
        acc['@@' + key] = null
        return acc
      }
      const key = decodeURIComponent(cur.slice(0, split_index))
      const value = decodeURIComponent(cur.slice(split_index + 1))
      acc['@@' + key] = value
      return acc
    }), {})
    return key => mapped['@@' + key]
  })()

  const search_not_set = key => get_search_key(key) === undefined
  const search_set = key => get_search_key(key) !== undefined
  const search_or_default = (key, default_ = null) => get_search_key(key) === undefined ? default_ : get_search_key(key)

  let OPT_MOVE_SELECTION // = search_set('move')
  let OPT_WRAP_SELECTION // = OPT_MOVE_SELECTION ? true : search_not_set('nowrap')
  let OPT_TIMER_REFRESH_INTERVAL = +search_or_default('timer_referesh', 1) || 1
  let OPT_DEFAULT_MARGIN_SIZE = +search_or_default('margin', 30) || 30
  let OPT_DEFAULT_SIZE = +search_or_default('size', 500) || 500
  let OPT_ANIMATED_SHUFFLE_HANDLER // = search_set('anime')
  let OPT_SHOW_SELECTIONS_WHEN_MOUSE_CONTROLS // = search_set('mouseselect')

  const DEFAULT_COLOUR_SCHEME = {
    up: '#222222',
    down: '#FFFF66',
    left: '#4488CC',
    right: '#55FF88'
  }

  const GREYSCALE_COLOUR_SCHEME = {
    up: '#222222',
    down: '#EDEDED',
    left: '#7B7B7B',
    right: '#BEBEBE'
  }

  const INVERTED_COLOUR_SCHEME = {
    up: '#DDDDDD',
    down: '#000099',
    left: '#BB7733',
    right: '#AA0077'
  }

  const rubiks_left_right = SwitchTile.randchoice_factory()([
    ['green', 'orange'],
    ['orange', 'blue'],
    ['blue', 'red'],
    ['red', 'green']
  ])

  // SwitchTile.shuffle_array(rubiks_left_right)

  const RUBIKS_COLOUR_SCHEME = {
    up: 'yellow',
    down: 'white',
    left: rubiks_left_right[0],
    right: rubiks_left_right[1]
  }

  const colour_scheme = {
    '@@default': DEFAULT_COLOUR_SCHEME,
    '@@': DEFAULT_COLOUR_SCHEME,
    '@@grey': GREYSCALE_COLOUR_SCHEME,
    '@@gray': GREYSCALE_COLOUR_SCHEME,
    '@@greyscale': GREYSCALE_COLOUR_SCHEME,
    '@@grayscale': GREYSCALE_COLOUR_SCHEME,
    '@@invert': INVERTED_COLOUR_SCHEME,
    '@@inverted': INVERTED_COLOUR_SCHEME,
    '@@rubik': RUBIKS_COLOUR_SCHEME,
    '@@rubiks': RUBIKS_COLOUR_SCHEME,
    '@@r': RUBIKS_COLOUR_SCHEME
  }['@@' + search_or_default('colourscheme', 'default')] || DEFAULT_COLOUR_SCHEME

  const colour_scheme_defaulter = {
    '@@up': colour_scheme.up,
    '@@down': colour_scheme.down,
    '@@left': colour_scheme.left,
    '@@right': colour_scheme.right
  }

  const colour_default = side => {
    const colour = search_or_default(side, colour_scheme[side])
    return colour_scheme_defaulter['@@' + colour] || colour
  }

  const OPT_COLOURS = {
    up: colour_default('up'),
    down: colour_default('down'),
    left: colour_default('left'),
    right: colour_default('right')
  }


  const options = {
    move: document.getElementById('opt-move'),
    wrap: document.getElementById('opt-wrap'),
    anime: document.getElementById('opt-anime'),
    mouse_select: document.getElementById('opt-mouse-select')
  }

  OPT_MOVE_SELECTION = !!options.move.checked
  OPT_WRAP_SELECTION = !!options.wrap.checked
  OPT_ANIMATED_SHUFFLE_HANDLER = !!options.anime.checked
  OPT_SHOW_SELECTIONS_WHEN_MOUSE_CONTROLS = !!options.mouse_select.checked

  options.move.addEventListener('change', () => { OPT_MOVE_SELECTION = !!options.move.checked }, false)
  options.wrap.addEventListener('change', () => { OPT_WRAP_SELECTION = !!options.wrap.checked }, false)
  options.mouse_select.addEventListener('change', () => { OPT_SHOW_SELECTIONS_WHEN_MOUSE_CONTROLS = !!options.mouse_select.checked }, false)

  let currently_animated_shuffling = OPT_ANIMATED_SHUFFLE_HANDLER ? 0 : null
  let selectiondiv_hidden = null

  options.anime.addEventListener('change', () => {
    if (options.anime.checked) {
      OPT_ANIMATED_SHUFFLE_HANDLER = true
      if (currently_animated_shuffling === null) {
        currently_animated_shuffling = 0
      }
    } else {
      OPT_ANIMATED_SHUFFLE_HANDLER = false
      currently_animated_shuffling = null
      if (selectiondiv_hidden !== null) {
        selectiondiv.hidden = selectiondiv_hidden
      }
    }
  }, false)

  const U = SwitchTile.UP_MASK
  const D = SwitchTile.DOWN_MASK
  const L = SwitchTile.LEFT_MASK
  const R = SwitchTile.RIGHT_MASK

  const images = make_images()
  const timer_display = timer_display_controller_factory()

  const inputs = {
    height: document.getElementById('height-input'),
    width: document.getElementById('width-input'),
    zoom: document.getElementById('zoom-input'),
    mouse: document.getElementById('mouse-input')
  }
  const gamediv = document.getElementById('game')
  const selectiondiv = document.getElementById('selection')
  const hovereventsdiv = document.getElementById('hover-events')
  const selectionlines = {
    left: document.getElementById('left'),
    right: document.getElementById('right'),
    top: document.getElementById('top'),
    bottom: document.getElementById('bottom')
  }
  const style = document.getElementById('dynamic-style')
  const size_style = document.getElementById('size-style')
  let margin = OPT_DEFAULT_MARGIN_SIZE
  let zoom = 1
  let size = OPT_DEFAULT_SIZE
  let mouse_controls = false

  const set_size = to => {
    size = to
    size_style.textContent = (
      '#content{max-width:' + (to + 4 * margin) + 'px}' +
      '#game{width:' + to + 'px;border-width:' + (0.5 * margin) + 'px}' +
      '#selection,#hover-events{width:' + to + 'px}' +
      '#left,#right{width:' + (2 * margin) + 'px}' +
      '#top,#bottom{height:' + (2 * margin) + 'px}'
    )
  }

  const get_tile_width = width => (size - (width + 1) * margin) / width

  const set_style = (height, width) => {
    // tile_width * width + (width + 1) * margin px = size px
    // tile_width = (size px - (width + 1) * margin px) / width
    const tile_width = get_tile_width(width)
    const div_height = (height * tile_width + (height + 1) * margin)
    style.textContent =
      '.switchtile-tile{width:' + tile_width + 'px}' +
      '#game{height:' + div_height + 'px}' +
      '#selection{margin-top:-' + (div_height + 0.5 * margin) + 'px;height:' + div_height + 'px}' +
      '#hover-events{margin-top:-' + div_height + 'px;height:' + div_height + 'px}' +
      '#hover-events span{width:' + (tile_width + margin) + 'px;height:' + (tile_width + margin) + 'px}'
  }

  const kill_children = node => {
    let last_child
    while ((last_child = node.lastChild)) node.removeChild(last_child)
  }

  const draw_game = switchtile => {
    // debugger
    const fragment = document.createDocumentFragment()
    const height = switchtile.height
    const width = switchtile.width
    const tile_width = get_tile_width(width)
    for (let y = 0; y < height; ++y) {
      const row = switchtile.tiles[y]
      for (let x = 0; x < width; ++x) {
        const tile = images[row[x]]()
        tile.setAttribute('style',
          'top:' + (margin * (y + 1) + tile_width * y) + 'px;left:' +
          (margin * (x + 1) + tile_width * x) + 'px'
        )
        //tile.setAttribute('style', 'top: 5px;left:5px')
        fragment.appendChild(tile)
      }
    }
    // gamediv.hidden = true
    kill_children(gamediv)
    gamediv.appendChild(fragment)
    // gamediv.hidden = false
  }

  const draw_selection = (selected_y, selected_x, width) => {
    if (mouse_controls && (!OPT_SHOW_SELECTIONS_WHEN_MOUSE_CONTROLS || (selectiondiv.hidden = selected_y === null))) {
      return
    }
    const tile_width = get_tile_width(width)
    const l_offset = margin * selected_x + tile_width * selected_x
    const t_offset = margin * selected_y + tile_width * selected_y
    selectionlines.left.style = 'left:' + l_offset + 'px'
    selectionlines.right.style = 'left:' + (l_offset + tile_width + margin) + 'px'
    selectionlines.top.style = 'top:' + t_offset + 'px'
    selectionlines.bottom.style = 'top:' + (t_offset + tile_width + margin) + 'px'
  }

  const set_if_mouse_controls = to => {
    mouse_controls = !!to
    draw_selection(selected_y, selected_x, game.width)
    if (!OPT_SHOW_SELECTIONS_WHEN_MOUSE_CONTROLS) selectiondiv.hidden = !!to
  }

  let drag_start_y = 0
  let drag_start_x = 0

  let drag_y = 0
  let drag_x = 0

  let currently_dragging = false

  const create_hitboxes = (height, width) => {
    const tile_width = get_tile_width(width)

    const create_hitbox = (y, x) => {
      const hitbox = document.createElement('span')
      hitbox.style = 'left:' + (0.5 * margin + (margin + tile_width) * x) + 'px;top:' + (0.5 * margin + (margin + tile_width) * y) + 'px'
      hitbox.addEventListener('mouseenter', e => {
        // debugger
        drag_y = y
        drag_x = x
        if (mouse_controls) {
          selected_y = y
          selected_x = x
          draw_selection(selected_y, selected_x, width)
          return prevent_all(e || event)
        }
      }, false)
      hovereventsdiv.appendChild(hitbox)
    }

    kill_children(hovereventsdiv)

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        create_hitbox(y, x)
      }
    }
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
  let move_counter = 0

  const movediv = document.getElementById('moves')
  const mpsdiv = document.getElementById('mps')

  const update_stats = (time, moves) => {
    movediv.textContent = 'Solved in ' + moves + ' moves'
    mpsdiv.textContent = time !== 0 ? ((moves / time).toFixed(2) + ' moves per second') : 'infinity?!?!?! moves per second'
  }

  const hide_stats = () => {
    movediv.textContent = ''
    mpsdiv.textContent = ''
  }

  window.b = () => {
    // debugger
    timer_display.stop()
    timer_display.clear()
    hide_stats()

    const width = Math.floor(+inputs.width.value || 3)
    const height = Math.floor(+inputs.height.value || width)

    const zoom_inp = +inputs.zoom.value
    if (zoom_inp >= 0.2 && zoom_inp < 100000000000000) {
      zoom = zoom_inp
      margin = OPT_DEFAULT_MARGIN_SIZE * zoom / width
      set_size(zoom_inp * OPT_DEFAULT_SIZE)
    } else {
      margin = OPT_DEFAULT_MARGIN_SIZE * zoom / width
    }

    set_if_mouse_controls(inputs.mouse.checked)

    game.reset(height, width)
    selected_y = 0
    selected_x = 0
    drag_start_y = 0
    drag_start_x = 0
    drag_y = 0
    drag_x = 0
    currently_dragging = false
    in_game = false
    move_counter = 0
    set_style(height, width)
    create_hitboxes(height, width)
    draw_game(game)
    draw_selection(selected_y, selected_x, width)
  }

  inputs.mouse.addEventListener('change', () => {
    set_if_mouse_controls(inputs.mouse.checked)
  }, false)

  const get_shuffle_number = game => Math.max(200, 2 * (game.height + 1) * (game.width + 1) + 1) + Math.floor(Math.random() * 2);

  const animated_shuffle_handler = () => {
    ++currently_animated_shuffling

    let shuffles = get_shuffle_number(game)
    const shuffle = game.get_shuffler()
    if (currently_animated_shuffling === 1) {
      selectiondiv_hidden = selectiondiv.hidden
      selectiondiv.hidden = true
    }
    const id = setInterval(() => {
      if (currently_animated_shuffling === null) {
        // Disabled in the middle
        clearInterval(id)
        while (shuffles-- > 0) {
          shuffle()
        }
        draw_game(game)
        return
      }
      if (shuffles-- > 0) {
        shuffle()
        draw_game(game)
      } else {
        clearInterval(id)
        --currently_animated_shuffling
        if (currently_animated_shuffling === 0) {
          selectiondiv.hidden = selectiondiv_hidden
          timer_display.stop()
          timer_display.clear()
          in_game = false
          moves = 0
        }
      }
    }, 10)
  }

  const shuffle_handler = () => {
    game.shuffle(null)
    draw_game(game)
  }

  window.s = () => {
    timer_display.stop()
    timer_display.clear()
    in_game = false
    moves = 0
    ; (OPT_ANIMATED_SHUFFLE_HANDLER ? animated_shuffle_handler : shuffle_handler)()
  }

  window.b()

  const prevent_all = e => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  const positive_mod = (a, b) => ((a % b) + b) % b

  const on_before_move = () => {
    if (!in_game) {
      in_game = true
      move_counter = 0
      timer_display.start(OPT_TIMER_REFRESH_INTERVAL)
    }
  }

  const on_after_move = () => {
    if (game.check()) {
      timer_display.stop()
      in_game = false
      update_stats(timer_display.get() / 1000, move_counter)
    }
    draw_game(game)
  }

  const keyboard_keyhandler = e => {
    // debugger
    const is_shift = e.getModifierState('Shift')
    let direction
    switch (e.key) {
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
      on_before_move()
      // debugger
      game.move([selected_x, selected_y], direction)
      ++move_counter
      on_after_move()
      if (!OPT_MOVE_SELECTION) return prevent_all(e)
    }
    draw_selection(selected_y, selected_x, game.width)
    return prevent_all(e)
  }

  const mouse_key_handler = e => {
    const direction = {
      '@@ArrowUp': D,
      '@@ArrowLeft': R,
      '@@ArrowDown': U,
      '@@ArrowRight': L
    }['@@' + e.key]
    if (direction === undefined) return
    on_before_move()
    game.move([selected_x, selected_y], direction)
    ++move_counter
    on_after_move()
    draw_game(game)
    // draw_selection(selected_y, selected_x, game.width)
    return prevent_all(e)
  }

  const keyhandler = e => {
    if (currently_animated_shuffling) return
    return (mouse_controls ? mouse_key_handler : keyboard_keyhandler)(e || event)
  }

  // document.body.addEventListener('keypress', )
  document.addEventListener('keydown', keyhandler, false)
  hovereventsdiv.addEventListener('mousedown', e => {
    // debugger
    if (!currently_dragging) {
      drag_start_y = drag_y
      drag_start_x = drag_x
      currently_dragging = true
      return prevent_all(e || event)
    }
  }, false)
  hovereventsdiv.addEventListener('mouseup', e => {
    if (currently_dragging) {
      currently_dragging = false
      if (drag_start_y === drag_y) {
        if (drag_start_x !== drag_x) {
          on_before_move()
          const dx = drag_x - drag_start_x
          game.move_left(drag_start_y, dx)
          move_counter += Math.min(positive_mod(dx, game.width), positive_mod(-dx, game.width))
          on_after_move()
        }
      } else if (drag_start_x === drag_x) {
        on_before_move()
        const dy = drag_y - drag_start_y
        game.move_up(drag_start_x, dy)
        move_counter += Math.min(positive_mod(dy, game.height), positive_mod(-dy, game.height))
        on_after_move()
      }
      return prevent_all(e || event)
    }
  }, false)

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

    const UC = OPT_COLOURS.up  // '#222222'
    const DC = OPT_COLOURS.down  // '#FFFF66'
    const LC = OPT_COLOURS.left  // '#4488CC'
    const RC = OPT_COLOURS.right  // '#55FF88'

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

    let last_time = 0

    const update_time_display = () => {
      const elapsed = last_time = timer()
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
      start: (delay) => {
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
      },
      get: () => last_time
    }
  }
})()
