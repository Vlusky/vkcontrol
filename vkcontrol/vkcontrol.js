var vkcontrol = {};

// Global States
vkcontrol.isShiftPressed = false;
vkcontrol.syncTimers = {};
vkcontrol.currentPage = "none"

// Swipe Configuration
vkcontrol.lastSwipeValue = undefined;
vkcontrol.swipeAccumulator = 0;
vkcontrol.SWIPE_SENSITIVITY = 15; // Lower = scrolls faster. Higher = more "friction" / requires more finger movement.
vkcontrol.TAP_JUMP_THRESHOLD = 30; // If delta is larger than this, treat it as an instant tap-jump and do not scroll.

// Constants
vkcontrol.FADER_PREFIX = 100;

// Flattened runtime caches
vkcontrol.inboundButtonMap = {}; // Key: "channel,cc" -> Values: { target, group }
vkcontrol.inboundFaderMap  = {}; // Key: "channel,cc" -> Values: { target, group, curve }
vkcontrol.outboundMap      = {}; // Key: "group,key"  -> Values: { ch, cc, type, curve }

// So basically, the CC numbers *are* their index in the array.
// This way I don't need to memorize and define the actual CC hex numbers (that I made myself) three times
vkcontrol.layout = {
    decks: {
        channels: [0, 1, 2, 3], // deck 3 and 4 are merely allocations. this touchosc interface has yet to made use of them
        buttons: [
            { target: "level_indicator", group: "[ChannelX]", key: "vu_meter", curve: "analog" }, // outbound only
            { target: "play", group: "[ChannelX]", key: "play", outKey: "play_indicator" },
            { target: "cue", group: "[ChannelX]", key: "cue_default", outKey: "cue_indicator" },
            { target: "sync", group: "[ChannelX]", key: "sync_enabled" },
            { target: "pfl", group: "[ChannelX]", key: "pfl" },
            { target: "nudge_left", group: "[ChannelX]" },
            { target: "nudge_right", group: "[ChannelX]" },
            { target: "transpose_up", group: "[ChannelX]" },
            { target: "transpose_down", group: "[ChannelX]" },
            { target: "match_key", group: "[ChannelX]" },
            { target: "reset_qfx", group: "[QuickEffectRack1_[ChannelX]]" },
            { target: "reset_eq", group: "[EqualizerRack1_[ChannelX]_Effect1]" },
            { target: "hotcue1", group: "[ChannelX]", key: "hotcue_1_status" },
            { target: "hotcue2", group: "[ChannelX]", key: "hotcue_2_status" },
            { target: "hotcue3", group: "[ChannelX]", key: "hotcue_3_status" },
            { target: "hotcue4", group: "[ChannelX]", key: "hotcue_4_status" },
            { target: "hotcue5", group: "[ChannelX]", key: "hotcue_5_status" },
            { target: "hotcue6", group: "[ChannelX]", key: "hotcue_6_status" },
            { target: "hotcue7", group: "[ChannelX]", key: "hotcue_7_status" },
            { target: "hotcue8", group: "[ChannelX]", key: "hotcue_8_status" },
            { target: "loop_halve", group: "[ChannelX]" },
            { target: "loop_double", group: "[ChannelX]" },
            { target: "loop_toggle", group: "[ChannelX]", key: "reloop_toggle", outKey: "loop_enabled" },
            { target: "beatloop_4", group: "[ChannelX]", key: "beatloop_4_toggle", outKey: "beatloop_4_enabled" },
            { target: "beatloop_8", group: "[ChannelX]", key: "beatloop_8_toggle", outKey: "beatloop_8_enabled" },
            { target: "beatloop_16", group: "[ChannelX]", key: "beatloop_16_toggle", outKey: "beatloop_16_enabled" },
            { target: "beatloop_32", group: "[ChannelX]", key: "beatloop_32_toggle", outKey: "beatloop_32_enabled" },
            { target: "beatjump_1_back", group: "[ChannelX]" },
            { target: "beatjump_2_back", group: "[ChannelX]" },
            { target: "beatjump_4_back", group: "[ChannelX]" },
            { target: "beatjump_8_back", group: "[ChannelX]" },
            { target: "beatjump_1_forward", group: "[ChannelX]" },
            { target: "beatjump_2_forward", group: "[ChannelX]" },
            { target: "beatjump_4_forward", group: "[ChannelX]" },
            { target: "beatjump_8_forward", group: "[ChannelX]" },
            { target: "route_fx1", group: "[EffectRack1_EffectUnit1]", key: "group_[ChannelX]_enable" },
            { target: "route_fx2", group: "[EffectRack1_EffectUnit2]", key: "group_[ChannelX]_enable" },

            // same deal with fx3 and fx4, they're there "just in case"
            { target: "route_fx3", group: "[EffectRack1_EffectUnit3]", key: "group_[ChannelX]_enable" },
            { target: "route_fx4", group: "[EffectRack1_EffectUnit4]", key: "group_[ChannelX]_enable" }
        ],
        faders: [
            { target: "volume",  group: "[ChannelX]", key: "volume", curve: "powTwo" },
            { target: "tempo",   group: "[ChannelX]", key: "rate",   curve: "bipolarBalance" },
            { target: "pregain", group: "[ChannelX]", key: "pregain", curve: "unipolarGain" },
            { target: "eq_lo",   group: "[EqualizerRack1_[ChannelX]_Effect1]", key: "parameter1", curve: "unipolarGain" },
            { target: "eq_mid",  group: "[EqualizerRack1_[ChannelX]_Effect1]", key: "parameter2", curve: "unipolarGain" },
            { target: "eq_hi",   group: "[EqualizerRack1_[ChannelX]_Effect1]", key: "parameter3", curve: "unipolarGain" },
            { target: "qfx",     group: "[QuickEffectRack1_[ChannelX]]", key: "super1", curve: "bipolar" }
        ]
    },

    master: {
        channels: [12],
        buttons: [
            { target: "shift" }
        ],
        faders: [
            { target: "headphone_gain", group: "[Master]", key: "headGain",       curve: "unipolarMasterGain" },
            { target: "headphone_mix",  group: "[Master]", key: "headMix",        curve: "bipolarBalance" },
            { target: "crossfader",     group: "[Master]",    key: "crossfader",  curve: "bipolarBalance" },
            { target: "master_gain",    group: "[Master]",    key: "gain",        curve: "unipolarMasterGain" }
        ]
    },

    effects: {
        channels: [10, 11],
        buttons: [
            { target: "fx1_on", group: "[EffectRack1_EffectUnitX_Effect1]", key: "enabled" },
            { target: "fx2_on", group: "[EffectRack1_EffectUnitX_Effect2]", key: "enabled" },
            { target: "fx3_on", group: "[EffectRack1_EffectUnitX_Effect3]", key: "enabled" },
            { target: "fx1_next", group: "[EffectRack1_EffectUnitX_Effect1]" },
            { target: "fx2_next", group: "[EffectRack1_EffectUnitX_Effect2]" },
            { target: "fx3_next", group: "[EffectRack1_EffectUnitX_Effect3]" },
            { target: "fx1_prev", group: "[EffectRack1_EffectUnitX_Effect1]" },
            { target: "fx2_prev", group: "[EffectRack1_EffectUnitX_Effect2]" },
            { target: "fx3_prev", group: "[EffectRack1_EffectUnitX_Effect3]" },
        ],

        faders: [
            { target: "depth",    group: "[EffectRack1_EffectUnitX]", key: "mix", curve: "linear" },
            { target: "fx1_meta", group: "[EffectRack1_EffectUnitX_Effect1]", key: "meta", curve: "linear" },
            { target: "fx2_meta", group: "[EffectRack1_EffectUnitX_Effect2]", key: "meta", curve: "linear" },
            { target: "fx3_meta", group: "[EffectRack1_EffectUnitX_Effect3]", key: "meta", curve: "linear" }
        ]
    },

    browse: {
        channels: [15],
        buttons: [
            { target: "browse_up" },
            { target: "browse_down" },
            { target: "browse_up_fast" },
            { target: "browse_down_fast" },
            { target: "load_deck1" },
            { target: "load_deck2" },
            { target: "toggle_focus" },
            { target: "preview_play", group: "[PreviewDeck1]", key: "play" }
        ],
        faders: [
            { target: "preview_scrub", group: "[PreviewDeck1]", key: "playposition", curve: "linear" },
            { target: "swipe_scroll" }
        ]
    },

    pages: {
        channels: [9],
        buttons: [
            { target: "effects" },
            { target: "main" },
            { target: "browse" }
        ]

    }
};

/**
 * Generic matrix compiler for control buttons.
 * Makes a hashmap (JS Object) that goes like { "channel,cc": { target, group } }
 * also maps Mixxx engine parameters to CC to send to TouchOSC, so { "group,key" : { ch, cc, type, curve } }
 */
vkcontrol.compileButtons = function(chIdx, buttons, token, replacement, callback) {
    if (!buttons) return;

    for (var b = 0; b < buttons.length; b++) {
        var btn = buttons[b];
        if (!btn) continue;

        var resolvedGroup = (btn.group && token) ? btn.group.replace(token, replacement) : (btn.group || "");
        var resolvedKey   = (btn.key && token)   ? btn.key.replace(token, replacement)   : (btn.key || "");

        var resolvedOut = resolvedKey;
        if (btn.outKey) {
            resolvedOut = token ? btn.outKey.replace(token, replacement) : btn.outKey;
        }

        var inKey = chIdx + "," + b;
        vkcontrol.inboundButtonMap[inKey] = { target: btn.target, group: resolvedGroup };

        if (resolvedGroup && resolvedOut) {
            var outKey = resolvedGroup + "," + resolvedOut;
            vkcontrol.outboundMap[outKey] = {
                ch: chIdx,
                cc: b,
                type: "button",
                curve: btn.curve || "binary"
            };

            engine.makeConnection(resolvedGroup, resolvedOut, callback);
            engine.trigger(resolvedGroup, resolvedOut);
        }
    }
};

/**
 * Generic matrix compiler for faders and knobs.
 * Same deal like the buttons, but this time { "channel,cc" : { target, group, curve } }
 */
vkcontrol.compileFaders = function(chIdx, faders, token, replacement, callback) {
    if (!faders) return;

    for (var f = 0; f < faders.length; f++) {
        var fad = faders[f];
        if (!fad) continue;

        var resolvedGroup = (fad.group && token) ? fad.group.replace(token, replacement) : (fad.group || "");
        var resolvedKey   = (fad.key && token)   ? fad.key.replace(token, replacement)   : (fad.key || "");
        var physicalCC    = vkcontrol.FADER_PREFIX + f;

        var inKey = chIdx + "," + physicalCC;
        vkcontrol.inboundFaderMap[inKey] = { target: fad.target, group: resolvedGroup, curve: fad.curve, key: resolvedKey };

        if (resolvedGroup && resolvedKey) {
            var outKey = resolvedGroup + "," + resolvedKey;
            vkcontrol.outboundMap[outKey] = { ch: chIdx, cc: physicalCC, type: "fader", curve: fad.curve };

            engine.makeConnection(resolvedGroup, resolvedKey, callback);
            engine.trigger(resolvedGroup, resolvedKey);
        }
    }
};

vkcontrol.init = function(id) {
    var btnCallback = vkcontrol.unifiedButtonCallback;
    var fadCallback = vkcontrol.unifiedFaderCallback;

    print("vkcontrol: Unrolling deck matrices...");
    var layoutDecks = vkcontrol.layout.decks;

    for (var d = 0; d < layoutDecks.channels.length; d++) {
        var chIdx = layoutDecks.channels[d];
        var chToken = "[Channel" + (d + 1) + "]";

        vkcontrol.compileButtons(chIdx, layoutDecks.buttons, "[ChannelX]", chToken, btnCallback);
        vkcontrol.compileFaders(chIdx, layoutDecks.faders, "[ChannelX]", chToken, fadCallback);
    }

    print("vkcontrol: Unrolling effects unit matrices...");
    var layoutFX = vkcontrol.layout.effects;

    for (var e = 0; e < layoutFX.channels.length; e++) {
        var chIdx = layoutFX.channels[e];
        var unitToken = "EffectUnit" + (e + 1);

        vkcontrol.compileButtons(chIdx, layoutFX.buttons, "EffectUnitX", unitToken, btnCallback);
        vkcontrol.compileFaders(chIdx, layoutFX.faders, "EffectUnitX", unitToken, fadCallback);
    }

    print("vkcontrol: Unrolling library browse mappings...");
    var layoutBrowse = vkcontrol.layout.browse;
    var browseChIdx = layoutBrowse.channels[0]; // 15

    vkcontrol.compileButtons(browseChIdx, layoutBrowse.buttons, null, null, btnCallback);
    vkcontrol.compileFaders(browseChIdx, layoutBrowse.faders, null, null, fadCallback);

    print("vkcontrol: Unrolling master channel mappings...");
    var layoutMaster = vkcontrol.layout.master;
    var masterChIdx = layoutMaster.channels[0];

    vkcontrol.compileButtons(masterChIdx, layoutMaster.buttons, null, null, btnCallback);
    vkcontrol.compileFaders(masterChIdx, layoutMaster.faders, null, null, fadCallback);

    print("vkcontrol: Unrolling system page tracking lookups...");
    var layoutPage = vkcontrol.layout.pages;
    var pageChIdx = layoutPage.channels[0]; // 9

    vkcontrol.compileButtons(pageChIdx, layoutPage.buttons, null, null, btnCallback);

    print("vkcontrol: System matrix initialization complete.");
};

vkcontrol.onCCEvent = function(channel, control, value, status, group) {
    if (control >= vkcontrol.FADER_PREFIX) {
        vkcontrol.incomingFader(channel, control, value);
    } else {
        vkcontrol.incomingButton(channel, control, value);
    }
};

// --- ALL INBOUND CONTROLLER BUTTON EVENT INTAKE ---
vkcontrol.incomingButton = function(channel, cc, value) {
    var lookup = vkcontrol.inboundButtonMap[channel + "," + cc];
    if (!lookup) return;

    var isPressed = value > 0;
    var group = lookup.group;

    switch (lookup.target) {
        case "shift":
            vkcontrol.isShiftPressed = isPressed;
            break;

        case "effects": case "main": case "browse":
            vkcontrol.currentPage = lookup.target;
            break;

        // --- DECK CONTROLS --
        case "play":
            if (isPressed) engine.setValue(group, "play", !engine.getValue(group, "play"));
            break;

        case "cue":
            engine.setValue(group, "cue_default", isPressed ? 1 : 0);
            break;

        case "sync":
            if (vkcontrol.syncTimers === undefined) {
                vkcontrol.syncTimers = {};
            }

            if (isPressed) {
                if (engine.getValue(group, "sync_enabled")) {
                    engine.setValue(group, "sync_enabled", 0);
                } else {
                    engine.setValue(group, "beatsync", 1);

                    (function(targetGroup) {
                        vkcontrol.syncTimers[targetGroup] = engine.beginTimer(500, function() {
                            engine.setValue(targetGroup, "sync_enabled", 1);
                            vkcontrol.syncTimers[targetGroup] = null;
                            print("vkcontrol: Sync Lock latched on " + targetGroup);
                        }, true);
                    })(group);
                }
            } else {
                if (vkcontrol.syncTimers[group]) {
                    engine.stopTimer(vkcontrol.syncTimers[group]);
                    vkcontrol.syncTimers[group] = null;
                }
            }
            break;

        case "pfl":
            if (isPressed) engine.setValue(group, "pfl", !engine.getValue(group, "pfl"));
            break;

        case "nudge_left":
            engine.setValue(group, "pitch_nudge_down", isPressed ? 1 : 0);
            break;

        case "nudge_right":
            engine.setValue(group, "pitch_nudge_up", isPressed ? 1 : 0);
            break;

        case "transpose_up":
            if (isPressed) engine.setValue(group, "pitch_up", 1);
            break;

        case "transpose_down":
            if (isPressed) engine.setValue(group, "pitch_down", 1);
            break;

        case "match_key":
            if (isPressed) engine.setValue(group, "match_key", 1);
            break;

        case "reset_qfx":
            if (isPressed) engine.setValue(group, "super1_set_default", 1);
            break;

        case "reset_eq":
            console.log("reset? " + group)
            if (isPressed) {
                engine.setValue(group, "parameter1", 1);
                engine.setValue(group, "parameter2", 1);
                engine.setValue(group, "parameter3", 1);
            }
            break;

        case "loop_halve":
            if (isPressed) engine.setValue(group, "loop_halve", 1);
            break;

        case "loop_double":
            if (isPressed) engine.setValue(group, "loop_double", 1);
            break;

        case "loop_toggle":
            if (isPressed) engine.setValue(group, "reloop_toggle", 1);
            break;

        // Hotcues 1-8 procedural routing
        case "hotcue1": case "hotcue2": case "hotcue3": case "hotcue4":
        case "hotcue5": case "hotcue6": case "hotcue7": case "hotcue8":
            var hcNum = lookup.target.replace("hotcue", "");

            if (vkcontrol.isShiftPressed) {
                if (isPressed) {
                    engine.setValue(group, "hotcue_" + hcNum + "_clear", 1);
                }
            } else {
                // When shift is released, mirror the exact hardware state (1 on press, 0 on release)
                engine.setValue(group, "hotcue_" + hcNum + "_activate", isPressed ? 1 : 0);
            }
            break;

        case "beatloop_4":  if (isPressed) engine.setValue(group, "beatloop_4_toggle", 1); break;
        case "beatloop_8":  if (isPressed) engine.setValue(group, "beatloop_8_toggle", 1); break;
        case "beatloop_16": if (isPressed) engine.setValue(group, "beatloop_16_toggle", 1); break;
        case "beatloop_32": if (isPressed) engine.setValue(group, "beatloop_32_toggle", 1); break;

        case "beatjump_1_back":    case "beatjump_2_back":    case "beatjump_4_back":    case "beatjump_8_back":
        case "beatjump_1_forward": case "beatjump_2_forward": case "beatjump_4_forward": case "beatjump_8_forward":
            if (isPressed) {
                var isForward = lookup.target.indexOf("forward") !== -1;
                var directionSuffix = isForward ? "_forward" : "_backward";

                // 9th character, the number.
                var baseBeats = parseInt(lookup.target.charAt(9), 10);
                var finalBeats = vkcontrol.isShiftPressed ? (baseBeats * 4) : baseBeats;
                print("beatjump_" + finalBeats + directionSuffix)
                engine.setValue(group, "beatjump_" + finalBeats + directionSuffix, 1);
            }
            break;

        case "route_fx1": case "route_fx2": case "route_fx3": case "route_fx4":
            if (isPressed) {
                print(chNum)
                var chNum = channel + 1; // 1, 2, 3, or 4
                var fxRoutingKey = "group_[Channel" + chNum + "]_enable";

                var currentRouting = engine.getValue(group, fxRoutingKey);
                engine.setValue(group, fxRoutingKey, !currentRouting);
            }
            break;

        // --- EFFECTS SECTION ---
        case "fx1_on": case "fx2_on": case "fx3_on":
            if (isPressed) {
                engine.setValue(group, "enabled", !engine.getValue(group, "enabled"));
            }
            break;

        case "fx1_next": case "fx2_next": case "fx3_next":
            if (isPressed) {
                engine.setValue(group, "next_effect", 1);
            }
            break;

        case "fx1_prev": case "fx2_prev": case "fx3_prev":
            if (isPressed) {
                engine.setValue(group, "prev_effect", 1);
            }
            break;

        // --- BROWSE PAGE --
        case "browse_up":
            if (isPressed) engine.setValue("[Library]", "MoveUp", 1);
            break;

        case "browse_down":
            if (isPressed) engine.setValue("[Library]", "MoveDown", 1);
            break;

        case "browse_up_fast":
            if (isPressed) engine.setValue("[Library]", "ScrollUp", 1);
            break;

        case "browse_down_fast":
            if (isPressed) engine.setValue("[Library]", "ScrollDown", 1);
            break;

        case "toggle_focus":
            if (isPressed) engine.setValue("[Library]", "MoveFocus", 1);
            break;

        case "load_deck1":
            if (isPressed) engine.setValue("[Channel1]", "LoadSelectedTrack", 1);
            break;

        case "load_deck2":
            if (isPressed) engine.setValue("[Channel2]", "LoadSelectedTrack", 1);
            break;

        case "preview_play":
            if (isPressed) engine.setValue("[PreviewDeck1]", "LoadSelectedTrackAndPlay", 1);
            break;
    }
};

/**
 * Inbound Fader Scaling.
 * Translates 7-bit MIDI values (0-127) into explicit Mixxx internal engine float bounds.
 */
vkcontrol.getScaledFader = function(ccValue, curveType) {
    var norm = ccValue / 127.0;

    switch (curveType) {
        case "linear":
        case "bipolar":
            return script.absoluteLin(ccValue, 0.0, 1.0, 0, 127);

        case "bipolarBalance":
            return script.absoluteLin(ccValue, -1.0, 1.0, 0, 127);

        case "bipolarBalanceInverted":
            return script.absoluteLin(ccValue, 1.0, -1.0, 0, 127);

        case "unipolarEQ":
            return script.absoluteNonLin(ccValue, 0.0, 1.0, 2.0, 0, 127);

        case "unipolarGain":
            return script.absoluteNonLin(ccValue, 0.0, 1.0, 4.0, 0, 127);

        case "unipolarMasterGain":
            return script.absoluteNonLin(ccValue, 0.0, 1.0, 5.0, 0, 127);

        case "powTwo":
            return norm * norm;

        default:
            return script.absoluteLin(ccValue, 0.0, 1.0, 0, 127);
    }
};

/**
 * Outbound Fader Scaling.
 * Translates Mixxx's internal engine values to 7-bit integers.
 */
vkcontrol.getMIDIValue = function(value, curveType) {
    switch (curveType) {
        case "linear":
        case "bipolar":
            return script.absoluteLinInverse(value, 0.0, 1.0, 0, 127);

        case "bipolarBalance":
            return script.absoluteLinInverse(value, -1.0, 1.0, 0, 127);

        case "bipolarBalanceInverted":
            return script.absoluteLinInverse(value, 1.0, -1.0, 0, 127);

        case "unipolarEQ":
            return script.absoluteNonLinInverse(value, 0.0, 1.0, 2.0, 0, 127);

        case "unipolarGain":
            return script.absoluteNonLinInverse(value, 0.0, 1.0, 4.0, 0, 127);

        case "unipolarMasterGain":
            return script.absoluteNonLinInverse(value, 0.0, 1.0, 5.0, 0, 127);

        case "powTwo":
            return Math.round(Math.sqrt(value) * 127);

        default:
            return script.absoluteLinInverse(value, 0.0, 1.0, 0, 127);
    }
}

/**
 * Inbound fader event handler.
 * Includes a special case for library swipe scroll.
 */
vkcontrol.incomingFader = function(channel, cc, value) {
    var lookup = vkcontrol.inboundFaderMap[channel + "," + cc];
    if (!lookup) return;

    if (lookup.target === "swipe_scroll") {
        vkcontrol.handleSwipeScroll(value);
        return;
    }

    // Direct math conversion and assignments
    var floatValue = vkcontrol.getScaledFader(value, lookup.curve);
    engine.setValue(lookup.group, lookup.key, floatValue);
};

/**
 * Swipe handler
 * Treats incoming fader position as touch position and calculates the swipe based on it.
 */
vkcontrol.handleSwipeScroll = function(value) {
    if (vkcontrol.lastSwipeValue === undefined) {
        vkcontrol.lastSwipeValue = value;
        return;
    }

    var delta = value - vkcontrol.lastSwipeValue;

    // If the distance is too large, they tapped a new spot on the fader screen.
    if (Math.abs(delta) > vkcontrol.TAP_JUMP_THRESHOLD) {
        vkcontrol.lastSwipeValue = value;
        return;
    }

    vkcontrol.swipeAccumulator += delta;

    // Check if the accumulated movement has cleared our sensitivity buffer
    if (Math.abs(vkcontrol.swipeAccumulator) >= vkcontrol.SWIPE_SENSITIVITY) {

        if (vkcontrol.swipeAccumulator > 0) {
            engine.setValue("[Library]", "MoveUp", 1);
        } else {
            engine.setValue("[Library]", "MoveDown", 1);
        }

        if (vkcontrol.swipeAccumulator > 0) {
            vkcontrol.swipeAccumulator -= vkcontrol.SWIPE_SENSITIVITY;
        } else {
            vkcontrol.swipeAccumulator += vkcontrol.SWIPE_SENSITIVITY;
        }
    }

    vkcontrol.lastSwipeValue = value;
};

// --- UNIFIED BUTTON STATE FEEDBACK ENGINE ---
vkcontrol.unifiedButtonCallback = function(value, group, key) {
    var lookup = vkcontrol.outboundMap[group + "," + key];
    if (!lookup || lookup.type !== "button") return;

    var byteVal = 0;

    // VU Meter Override
    if (lookup.target === "analog") {
        if (vkcontrol.currentPage !== "main") return;
        byteVal = Math.round(value * 127);
        if (byteVal > 127) byteVal = 127;
        if (byteVal < 0)   byteVal = 0;
    } else {
        byteVal = value ? 127 : 0;
    }

    // Direct status transmission shortcut (e.g., 0xB0 for Ch 1, 0xB1 for Ch 2...)
    midi.sendShortMsg(0xB0 | lookup.ch, lookup.cc, byteVal);
};

// --- UNIFIED FADER POSITION FEEDBACK ENGINE ---
vkcontrol.unifiedFaderCallback = function(value, group, key) {
    var lookup = vkcontrol.outboundMap[group + "," + key];
    if (lookup && lookup.type === "fader") {
        var midiValue = vkcontrol.getMIDIValue(value, lookup.curve);
        midi.sendShortMsg(0xB0 | lookup.ch, lookup.cc, midiValue);
    }
};
