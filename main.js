var goos = [
    [-194, 795],
    [-83, 860],
    [74, 773],
    [-24, 700]
]

var beach_box = [
    [-1272, 1013],
    [-1272, 1238],
    [-898, 1238],
    [-904, 986]
]

var mansion_coord = [
    [706, 672],
    [706, 697],
    [495, 697],
    [706, 820]
]

var croc_coord = [
    [895, 1618],
    [704, 1618],
    [704, 1811],
    [895, 1811]
]

var bat_cave = [
    [1003, -952],
    [1379, -952],
    [1379, -590],
    [1003, -590]
]

var a_bees = [
    [1114, -777],
    [1326, -767],
    [1412, -884],
    [1205, -1001],
    [933, -940],
    [811, -809]
]

var dark_forest = [
    [-424, -302],
    [-433, -692],
    [-648, -843],
    [-729, -717],
    [-729, -433],
    [-680, -220]
]

// CONFIG
var con = {
    // Flags
    subscribed: false,
    stand_is_open: false,
    selling: false,
    char_x: character.x,
    char_y: character.y,
    char_map: character.map,
    smart_move_active: false,
    comp_item_index: 0,
    combining: false,
    array_index_for_id: [],
    estimated_enemies_killed: 0,
    estimated_exp_gained: 0,
    tempExpToGain: 0,
    coord_index: 0,		   // change starting coord_index
    spot_accuracy: 4.0,    // smaller the number = longer you stand in place

    // Potion Config
    min_pots: 10,
    hpot: 'hpot1',
    mpot: 'mpot1',
    quan_pots: 10,

    // Combat Config
    min_monster_xp: 0,  // change to target weaker/stronger enemies
    max_monster_atk: 0,  // change to target weaker/stronger enemies

    // Bank Config
    min_inventory_size: 2,
    compoundable_slot: 'items0',
    util_slot: 'items1',
    compoundable_slot2: 'items2',

    // Sell Config
    items_to_sale: ['wcap', 'helmet', 'gloves', 'pants', 'coat', 'blade', 'claw', 'staff', 'bow', 'wshield', 'wand', 'ecape', 'eslippers', 'epyjamas', 'eears', 'carrotsword', 'bataxe', 'quiver', 'wshoes', 'slimestaff'],

    // Combine Config
    comp_items: ['hpbelt', 'hpamulet', 'wbook0', 'ringsj', 'dexring', 'strring'],
    level: 0,
    max_level: 4,
    total_loops: 0,
}

////////////////////////////////// SCRIPT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
let party = ['Dexla', 'Noirme', 'Magra', 'z0t0b', 'z0b0t', 'zotob', 'Draxious', 'Sacerdos', 'Fender', 'Gibson', 'Yamaha']

var usesCoordMove = true // false for normal attack
var shouldBuyPotions = true
var should_deposit = true
var should_sell = true

var action = 'farm' // 'farm', 'xy', 'combine', 'egg', 'exchange', 'merchant'
var coord = goos // change to which coord you want to use

// Call party every 10
callEveryTenMinutes(send_party_invites)

game.on("event", function (data) {
    data.event_name = name;
    log("EVENT: " + name)

    //action = "event"

    //smart_move({ map: data.map }, function () {
    //    smart_move(data.name)
    //})
});

character.on("death", function (data) {
    check_death()
});

setInterval(function () {
    if (character.moving || con.smart_move_active || con.combining || con.selling) return;

    if (action == "event") {
        return
    }

    if (action == 'combine') {
        combine_from_inventory()
    }

    if (action == 'egg') {
        auto_craft("basketofeggs")
    }

    if (action == 'sell') {
        sell_items()
    }

    if (action == 'merchant') {
        if (!con.stand_is_open) {
            open_stand()
        }
    }

    if (action == 'farm') {
        farm()
    }

    if (action == 'exchange') {
        exchange(0)
    }

    if (action == 'xy') {
        log_xy()
    }
}, 250);

// Farm Functions---------------------------------------------------------
function farm() {
    loot()
    if (character.gold > 10000) {
        check_potions()
    }
    check_inventory()
    check_hp_mp()

    var target = get_target()

    if (target != null) {
        con.tempExpToGain = target.xp

        // Ranger Skills
        if (character.ctype === 'ranger') {
            if (target.hp > 500) {
                use_supershot(target);
            }
        }

        // Mage Skills
        if (character.ctype === 'mage') {
            use_manaburst(target)

            if (character.hp / character.max_hp <= .20) {
                use_blink()
            }
        }

        if (usesCoordMove)
            coord_move(target)
        else
            use_attack_on(target)
    }
}

// Move Util--------------------------------------------------------------
// Possible Actions: 'store'
function go_to_bank(action) {
    log_all('Going to bank!')

    smart_move({ map: 'main' }, function () {
        smart_move({ map: 'bank' }, function () {
            if (action == 'store')
                store_items()

            leave_bank()
        })
    })
}

function leave_bank() {
    log_all('Leaving bank!')
    smart_move({ to: 'potions', map: 'main' }, function () {
        sell_items()
        move_back_to_farm()
    })
}

// Possible Actions: 'go back'
function go_to_potions(action) {
    smart_move({ to: "potions", map: 'main' }, function () {
        buy_potions()
        if (action == 'go back') {
            move_back_to_farm()
        }
    })
}

function buy_potions() {
    log('Buying potions...')
    if (quantity(con.hpot) <= con.min_pots) {
        buy_with_gold(con.hpot, con.quan_pots)
        log(`Bought ${con.quan_pots} of ${con.hpot}`)
    }
    if (quantity(con.mpot) <= con.min_pots) {
        buy_with_gold(con.mpot, con.quan_pots)
        log(`Bought ${con.quan_pots} of ${con.mpot}`)
    }
}

// Farm Util--------------------------------------------------------------
function check_inventory() {
    if (should_deposit && (character.esize <= con.min_inventory_size)) {
        log('Inventory full!!')
        save_coord()
        go_to_bank('store')
    }
}

function check_potions() {
    if (!shouldBuyPotions) {
        return
    }

    if (quantity('hpot1') <= con.min_pots || quantity('mpot1') <= con.min_pots) {
        log('Need potions!')
        save_coord()
        go_to_potions('go back')
    }
}

function check_death() {
    if (character.rip) {
        save_coord()
        respawn()
        move_back_to_farm()
    }
}

function check_hp_mp() {
    if (((character.hp / character.max_hp) <= .70) ||
        (character.mp / character.max_mp) <= .50) {

        use_hp_or_mp();
    }
}

function get_target() {

    // Get current monster targeted
    var target = get_targeted_monster();
    if (target) {
        return target
    }

    // Get nearest monster instead
    target = get_nearest_monster({
        min_xp: con.min_monster_xp,
        max_att: con.max_monster_atk,
        path_check: true
    })

    if (target) {
        con.estimated_enemies_killed += 1
        con.estimated_exp_gained += con.tempExpToGain

        log(`${target.xp} exp gained!`)
        log(`${con.estimated_enemies_killed} enemies killed!`)
        log(`${con.estimated_exp_gained} exp gained!`)

        change_target(target);
    } else {
        set_message("No Monsters nearby");
        log('Moving to monster coord...')
        con.smart_move_active = true
        smart_move({ x: coord[0][0], y: coord[0][1] }, function () {
            con.smart_move_active = false
        });
    }
}

// Attack Functions-------------------------------------------------------
function coord_move(target) {
    if (target == null) {
        return
    }

    // Get location coord
    var coord_x = coord[con.coord_index][0]
    var coord_y = coord[con.coord_index][1]

    // If in range, just move towards toward next box location
    if (in_attack_range(target)) {
        move(
            character.real_x + (coord_x - character.real_x) / 4,
            character.real_y + (coord_y - character.real_y) / 4
        );

        // Check if pretty close to spot
        var x = Math.abs(coord_x - character.real_x)
        var y = Math.abs(coord_y - character.real_y)
        if ((x < con.spot_accuracy) && (y < con.spot_accuracy)) {

            // Increment coord_index or set back to 0
            if (con.coord_index == coord.length - 1) {
                con.coord_index = 0
            } else {
                con.coord_index = con.coord_index + 1
            }
        }
    }
    // Not in range, go directly towards target
    else {
        move(
            character.real_x + (target.real_x - character.real_x) / 4,
            character.real_y + (target.real_y - character.real_y) / 4
        );
    }

    // Attack if possible
    if (can_attack(target)) {
        set_message("Attacking");
        attack(target);
    }
}

function use_attack_on(target) {
    if (!in_attack_range(target)) {
        move(
            character.real_x + (target.real_x - character.real_x) / 6,
            character.real_y + (target.real_y - character.real_y) / 6
        );
    }
    else if (can_attack(target)) {
        attack(target);
    }
}

// Util Methods-----------------------------------------------------------
function log_xy() {
    log('--------------')
    log('x')
    log(character.real_x)
    log('y')
    log(character.real_y)
    log('--------------')
}

function log_all(string) {
    log(string)
    set_message(string)
}

function save_coord() {
    con.smart_move_active = true
    con.char_x = character.x
    con.char_y = character.y
    con.char_map = character.map
}

function move_back_to_farm() {
    log_all('Moving back to farm.')

    con.smart_move_active = true
    var new_map = get_map()
    if (new_map == con.char_map) {
        smart_move({ x: con.char_x, y: con.char_y }, function () {
            con.smart_move_active = false
        });
    } else {
        smart_move({ map: con.char_map }, function () {
            smart_move({ x: con.char_x, y: con.char_y }, function () {
                con.smart_move_active = false
            })
        });
    }
}

// Party Functions--------------------------------------------------------
function send_party_invites() {
    log('Sending party invites...')
    for (name of party) {
        send_party_invite(name, false)
    }
}

function on_party_invite(name) {
    for (name of party) {
        if (con.party.includes(name)) {
            log('Joining party...')
            accept_party_invite(name)
        }
    }
}

function on_party_request(name) {
    for (name of party) {
        if (con.party.includes(name)) {
            accept_party_request(name)
        }
    }
}

function callEveryTenMinutes(my_function) {
    if (character.ctype === 'merchant') {
        return
    }

    my_function()

    return window.setTimeout(function () {
        my_function()
        callEveryTenMinutes(my_function);
    }, 600000);
}


// Skills-----------------------------------------------------------------
// Ranger Skills
function use_hunterMark(target) {
    log(`Using Hunter's Mark on ${target.name}`)
    use_skill('huntersmark', target)
}

function use_supershot(target) {
    if (!is_on_cooldown('supershot')) {
        log(`Using Supershot on ${target.name}`)
        use_skill('supershot', target)
    }
}

// Mage Skills
function use_manaburst(target) {
    if (!is_on_cooldown('burst')) {
        log(`Using ManaBurst on ${target.name}`)
        use_skill('burst', target)
    }
}

function use_blink() {
    if (!is_on_cooldown('blink')) {
        log('Using Blink')
        use_skill('blink')
    }
}

// Priest Skills
function use_curse(target) {
    log(`Using Curse on ${target.name}`)
    use_skill('curse', target)
}

// Inventory Management--------------------------------------------------
function store_items() {
    log_all('Depositing compundable items.')
    for (let i = 0; i < character.items.length; i++) {
        let item = character.items[i]

        if ((item != null) && parent.G.items[item.name].compound) {
            bank_store(i, compoundable_slot)
        }
    }

    log_all('Depositing compundable items 2.')
    for (let i = 0; i < character.items.length; i++) {
        let item = character.items[i]

        if ((item != null) && parent.G.items[item.name].compound) {
            bank_store(i, compoundable_slot2)
        }
    }

    log_all('Depositing util items.')
    for (let i = 0; i < character.items.length; i++) {
        let item = character.items[i]

        if ((item != null) && parent.G.items[item.name].explanation) {
            bank_store(i, util_slot)
        }
    }
}

function sell_items() {
    smart_move({ to: 'potions' }, function () {
        if (should_sell) {
            con.selling = true
            log_all('Selling upgradable items.')
            for (let i = 0; i < character.items.length; i++) {
                let item = character.items[i]

                if (item != null) {
                    if (con.items_to_sale.includes(item.name)) {
                        sell(i, quantity(item))
                    }
                }
            }
            log_all('Done selling!')
            con.selling = false
        }
    })

}

function combine_from_inventory() {
    con.combining = true

    if (con.total_loops == 3) {
        log_all('Done.')
        action = 'pending'
        return
    }

    if (con.level == con.max_level) {
        con.combining = true
        log_all('Re-running algorithm.')
        con.level = 0
        con.total_loops += 1
    }

    if (con.comp_item_index == comp_items.length) {
        con.level += 1
        con.comp_item_index = 0
    }

    log_all('Finding..')

    let id = con.comp_items[con.comp_item_index]

    if (quantity('cscroll0') == 0) {
        log_all('Buying scroll.')
        buy_with_gold('cscroll0', 10)
        con.combining = false
    }

    var scroll_index = get_index_of('cscroll0')

    if (scroll_index == -1) {
        return
    }

    // Find all indexes of this id
    for (let i = 0; i < character.items.length; i++) {
        let item = character.items[i]

        if ((item != null) && parent.G.items[item.name].id == id) {
            if (item.level == level)
                con.array_index_for_id.push(i)
        }
    }

    if (con.array_index_for_id.length < 3) {
        log_all('Not enough to combine.')
        con.combining = false
        con.comp_item_index += 1
        con.array_index_for_id = []
        return
    }

    var first = con.array_index_for_id[0]
    var second = con.array_index_for_id[1]
    var third = con.array_index_for_id[2]

    log_all('Attempting compound...')
    compound(first, second, third, scroll_index).then(function (data) {
        if (data.success) {
            log_all('Success!')
        } else {
            log_all('Failure!')
        }

        con.array_index_for_id = []
        con.combining = false
    })
}

function get_index_of(name) {
    for (let i = 0; i < character.items.length; i++) {
        let item = character.items[i]

        if ((item != null) && item.name == name) {
            return i
        }
    }

    return -1
}

// Merchant Util----------------------------------------------------------
function open_stand() {
    var index = get_index_of('stand0')

    if (index == -1) {
        log('No stand found')
        return
    }

    parent.open_merchant(index)
    con.stand_is_open = true
}

function close_stand() {
    var index = get_index_of('stand0')

    if (index == -1) {
        log('No stand found')
        return
    }

    parent.close_merchant(index)
    con.stand_is_open = false
}
