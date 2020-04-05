
// State Config
var attack_mode=true
var state = 'farm' // 'farm', 'xy'
var char_x = character.x
var char_y = character.y
var char_map = character.map
var smart_move_active = false

// Party Config
var party = ['Dexla', 'Noirme', 'Magra', 'zobot', 'z0t0b', 'zotob', 'Draxious']
callEveryFullHour(send_party_invites)

// Potion Config
var buy_pots = true
var min_pots = 10
var hpot = 'hpot1'
var mpot = 'mpot1'
var quan_pots = 1000

// Combat Config
var xp = 0
var min_monster_xp = 1800  // change to target weaker/stronger enemies
var max_monster_atk = 120  // change to target weaker/stronger enemies
var lastsupershot
var lastmanaburst
var lastblink

// Bank Config
var should_deposit = true
var min_inventory_size = 8
var compoundable_slot = 'items0'
var util_slot = 'items1'

// AFK Config
var estimated_enemies_killed = 0
var estimated_exp_gained = 0

// Coord Move Config
var usesCoordMove = true  // false for normal attack
var coord_index = 0		   // change starting coord_index
var spot_accuracy = 4.0    // smaller the number = longer you stand in place
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

var coord = bat_cave // change to which coord you want to use

setInterval(function() {
	if(character.moving || smart_move_active) return;

	if (state == 'farm') {
		farm()
	} 
	
	if (state == 'xy') {
		//log_xy()
		return
	}

},250);

// Util Methods-----------------------------------------------------------
function buy_potions() {
	log('Buying potions...')
	if (quantity('hpot1') <= min_pots) {
		buy_with_gold(hpot, quan_pots)
		log(`Bought ${quan_pots} of ${hpot}`)
	}
	if (quantity('mpot1') <= min_pots) {
		buy_with_gold(mpot, quan_pots)
		log(`Bought ${quan_pots} of ${hpot}`)
	}
}

function log_xy() {
	log('--------------')
	log('x')
	log(character.real_x)
	log('y')
	log(character.real_y)
	log('--------------')
}

function save_coord() {
	smart_move_active = true
	var char_x = character.x
	var char_y = character.y
	var char_map = character.map
}

function move_back_to_farm() {
	var new_map = get_map()
	if (new_map == char_map) {
		smart_move({x:char_x, y:char_y}, function() {
			smart_move_active = false
		});
	} else {
		smart_move({map: char_map}, function() {
			smart_move({x:char_x, y:char_y}, function() {
				smart_move_active = false
			})
		});
	}	
}

// Inventory Management--------------------------------------------------
function store_items() {	
	log('Depositing compundable items.')
	for (let i = 0; i < character.items.length; i++) {
    	let item = character.items[i]

		if ((item != null) && parent.G.items[item.name].compound) {
			 bank_store(i, compoundable_slot)
		} 
	}
	
	log('Depositing util items.')
	for (let i = 0; i < character.items.length; i++) {
    	let item = character.items[i]
		
		if ( (item != null) && parent.G.items[item.name].explanation) {
			bank_store(i, util_slot)
		}
	}

	log('Leaving bank!')
	smart_move({map: 'main'}, function() {
		sell_items()
	})
}

function sell_items() {
	smart_move({map: 'potions'})
	
	log('Selling upgradable items.')
	for (let i = 0; i < character.items.length; i++) {
    	let item = character.items[i]

		if ((item != null) && parent.G.items[item.name].upgrade) {
			sell(i, quanity(item))
		} 
	}
	
	log('Moving back to farm.')
	move_back_to_farm()
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
		if (party.includes(name)) {
			log('Joining party...')
			accept_party_invite(name)	
		}
	}
}

function on_party_request(name) {
	for (name of party) {
		if (party.includes(name)) {
			log('Joining party...')
			accept_party_request(name)
		}
	}
}

function callEveryFullHour(my_function) {
	my_function()
	
    return window.setTimeout( function() {
        my_function()
        callEveryFullHour(my_function);
    }, 600000);
}

// Farm Functions---------------------------------------------------------
function farm() {
	loot()
	check_potions()
	check_inventory()
	check_death()
	check_hp_mp()
	
	var target = get_target()
	
	// Ranger Skills
	if (character.ctype === 'ranger') {
		if (target.hp > 500) {
    		use_supershot(target);
		}
	}
	
	// Mage Skills
	if (character.ctype === 'mage') {
		use_manaburst(target)
		
		if (character.hp/character.max_hp <= .20) {
			use_blink()
		}
	}

	if (usesCoordMove) 
		coord_move(target)	
	else 
		use_attack_on(target)
}

// Farm Util--------------------------------------------------------------
function check_potions() {
	if (buy_pots && (quantity('hpot1') <= min_pots || quantity('mpot1') <= min_pots)) 	  {
		log('Need potions!')
		save_coord()
		
		smart_move({to:"potions"}, function() { 
			buy_potions()
			move_back_to_farm()
		});
	}
}

function check_inventory() {
	if (should_deposit && (character.esize <= min_inventory_size)) {
		log('Inventory full!!')
		save_coord()
		
		smart_move({map: "bank"}, function() {
			store_items()
		})
	}
}

function check_death() {
	if(character.rip) {
		save_coord()
		respawn()
		move_back_to_farm()
	}
}

function check_hp_mp() {
	if( ((character.hp/character.max_hp) <= .70) || 
		(character.mp/character.max_mp) <= .30) {
		
		use_hp_or_mp();
	}
}

function get_target() {
	var target = get_targeted_monster();
	if (!target) {
		target = get_nearest_monster({
			min_xp: min_monster_xp,
			max_att: max_monster_atk,
			path_check: true,
			no_target: true
		})

		if (target) {
			estimated_enemies_killed += 1
			estimated_exp_gained += character.xp-xp
			log(`${character.xp-xp} exp gained!`)
			log(`${estimated_enemies_killed} enemies killed!`)
			log(`${estimated_exp_gained} exp gained!`)
			change_target(target);
			
			if (character.ctype === 'ranger')
				use_hunterMark(target)		
		} else {
			set_message("No Monsters");
			return;
		}
	}
	return target
}

// Attack Functions--------------------------------------------------------
function coord_move(target) {
	// Get location coord
	coord_x = coord[coord_index][0]
	coord_y = coord[coord_index][1]
		
	// If in range, just move towards toward next box location
	if(in_attack_range(target)) {
		move(
			character.real_x+(coord_x-character.real_x)/4,
			character.real_y+(coord_y-character.real_y)/4
		);
		
		// Check if pretty close to spot
		var x = Math.abs(coord_x - character.real_x)
		var y = Math.abs(coord_y - character.real_y)
		if ( (x < spot_accuracy) && (y < spot_accuracy)) {
			
			// Increment coord_index or set back to 0
			if (coord_index == coord.length-1) {
				coord_index = 0
			} else {
				coord_index = coord_index + 1	
			}
		}
	} 
	// Not in range, go directly towards target
	else {
		move(
			character.real_x+(target.real_x-character.real_x)/4,
			character.real_y+(target.real_y-character.real_y)/4
		);
	}
	
	// Attack if possible
	if(can_attack(target)) {
		set_message("Attacking");
		attack(target);
		xp = character.xp
	}
}

function use_attack_on(target) {
	if(!in_attack_range(target)) {
		move(
			character.real_x+(target.real_x-character.real_x)/6,
			character.real_y+(target.real_y-character.real_y)/6
		);
	}
	else if(can_attack(target))
	{
		attack(target);
		xp = character.xp
	}	
}

// Skills------------------------------------------------------------------
// Ranger Skills
function use_hunterMark(target) {
	log(`Using Hunter's Mark on ${target.name}`)
	use_skill('huntersmark', target)
}

function use_supershot(target) {
	if (!lastsupershot || new Date() - lastsupershot > 30000) { // 30 seconds
    	lastsupershot = new Date();
    	log(`Using Supershot on ${target.name}`)
		use_skill('supershot', target)
  	}
}

// Mage Skills
function use_manaburst(target) {
	if (!lastmanaburst || new Date() - lastmanaburst > 6000) { // 6 seconds
    	lastmanaburst = new Date();
    	log(`Using ManaBurst on ${target.name}`)
		use_skill('burst', target)
  	}
}

function use_blink() {
	if (!lastblink || new Date() - lastblink > 1200) { // 1.2 seconds
    	lastblink = new Date();
    	log('Using Blink')
		use_skill('blink')
  	}
}