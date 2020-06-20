{
    let grimoire = Game.Objects['Wizard tower'].minigame;
    let M = grimoire;
    let Upgrade = function (name, desc, price, icon, buyFunction) {
        let upgrade = new Game.Upgrade(name, desc, price, icon, buyFunction);
        upgrade.lModded = true;
        return upgrade;
    }

    let Unlock = function (upgrade) {
        Game.Unlock(upgrade);
        if (typeof Game.Upgrades[upgrade] !== "undefined" && Game.Upgrades[upgrade]) {
            LModSave.Upgrades[upgrade.name].unlocked = true;
            LModSaveConfig();
        }
    }

    Game.Upgrade.prototype.buy = new Proxy(Game.Upgrade.prototype.buy, {
        apply: function (target, thisArg, args) {
            let upgrade = target.apply(thisArg, args);
            if (upgrade) {
                LModSave.Upgrades[thisArg.name].bought = true;
                LModSaveConfig();
            }
            return upgrade;
        }
    })

    if (typeof LMod === 'undefined') LMod = {};

    new Upgrade("Quick wizards", "Magic regenerates <b>10%<b> faster.", 16500000000000000, [21, 11]);
    new Upgrade("Efficient spells", "Spells cost <b>5%<b> less magic.", 165000000000000000000000, [22, 11]);
    new Upgrade("Wizardry adepts", "Spells have a <b>10%<b> smaller chance to backfire.", 1650000000000000000000000000000, [29, 11]);

    let i = 0;
    Game.Upgrades['Quick wizards'].order = 1485 + i++;
    Game.Upgrades['Efficient spells'].order = 1485 + i++;
    Game.Upgrades['Wizardry adepts'].order = 1485 + i++;

    Game.customChecks = Game.customChecks.concat([
        () => { if (grimoire.spellsCastTotal >= 9) Game.Unlock('Quick wizards') },
        () => { if (grimoire.spellsCastTotal >= 99) Game.Unlock('Efficient spells') },
        () => { if (grimoire.spellsCastTotal >= 999) Game.Unlock('Wizardry adepts') }
    ]);

    LModSavePrefix = "LMod";
    LModSaveConfig = () => localStorage.setItem(LModSavePrefix, JSON.stringify(LModSave));

    function initUpgrade(upgrade) {
        LModSave.Upgrades[upgrade.name] = {};
        LModSave.Upgrades[upgrade.name].unlocked = false;
        LModSave.Upgrades[upgrade.name].bought = false;
    }

    LModSaveDefault = function () {
        if (typeof LModSave === 'undefined') {
            LModSave = {};
        }

        LModSave.Upgrades = {};
        for (var i in Game.Upgrades) {
            var upgrade = Game.Upgrades[i];
            if (upgrade.lModded) initUpgrade(upgrade);
        }
        LModSaveConfig();
    }

    LModLoadConfig = function () {
        if (localStorage.getItem(LModSavePrefix) != null) {
            LModSave = JSON.parse(localStorage.getItem(LModSavePrefix));
            if (typeof LModSave.Upgrades === 'undefined') {
                LModSave.Upgrades = {};
            }
            for (var i in Game.Upgrades) {
                var upgrade = Game.Upgrades[i];
                if (upgrade.lModded) {
                    if (typeof LModSave.Upgrades[upgrade.name] === 'undefined') {
                        initUpgrade(upgrade);
                    }
                    else {
                        console.log(upgrade.toString());
                        if (LModSave.Upgrades[upgrade.name].unlocked) Unlock(upgrade.name);
                        if (LModSave.Upgrades[upgrade.name].bought) Game.Upgrades[upgrade.name].bought = 1;
                    }
                }
            }
        }
        else LModSaveDefault();
    }

    Game.HardReset = new Proxy(Game.HardReset, {
        apply: function (target, thisArg, args) {
            if (args[0] == 2) LModSaveDefault();
            return target.apply(thisArg, args);
        }
    })

    LModLoadConfig();

    eval("grimoire.logic = " + grimoire.logic.toString().replace("M.magicPS=Math.max(0.002,Math.pow(M.magic/Math.max(M.magicM,100),0.5))*0.002;", "M.magicPS=Math.max(0.002,Math.pow(M.magic/Math.max(M.magicM,100),0.5))*0.002;\nif (Game.Has('Quick wizards')) M.magicPS *= 1.1;"));

    grimoire.getSpellCost = new Proxy(grimoire.getSpellCost, {
        apply: function (target, thisArg, args) {
            let cost = target.apply(thisArg, args);
            if (Game.Has('Efficient spells')) cost *= 0.95;
            return cost;
        }
    })

    grimoire.getSpellCostBreakdown = new Proxy(grimoire.getSpellCostBreakdown, {
        apply: function (target, thisArg, args) {
            if (!Game.Has('Efficient spells')) return target.apply(thisArg, args);
            let spell = args[0];
            let originalCostMin = spell.costMin;
            let originalCostPercent = null;
            spell.costMin *= 0.95;
            if (spell.costPercent) {
                originalCostPercent = spell.costPercent;
                spell.costPercent *= 0.95;
            }
            let result = target.apply(thisArg, args);
            spell.costMin = originalCostMin;
            if (spell.costPercent) spell.costPercent = originalCostPercent;
            return result;
        }
    })

    grimoire.getFailChance = new Proxy(grimoire.getFailChance, {
        apply: function (target, thisArg, args) {
            let failChance = target.apply(thisArg, args);
            if (Game.Has('Wizardry adepts')) failChance *= 0.9;
            return failChance;
        }
    })

    Game.LoadMod = new Proxy(Game.LoadMod, {
        apply: function (target, thisArg, args) {
            console.log("mod loaded");
            let id = url.split('/'); id = id[id.length - 1].split('.')[0];
            target.apply(thisArg, args);
            if (id === "CookieMonster") {
                console.log("cm loading after lmod");
                fixCookieMonsterGriomoireRefillTimer();
            }
        }
    })

    if (window.CM) {
        console.log("CM found loaded");
        fixCookieMonsterGriomoireRefillTimer();
    }

    function fixCookieMonsterGriomoireRefillTimer() {
        CM.Disp.CalculateGrimoireRefillTime = new Proxy(CM.Disp.CalculateGriomoreRefillTime, {
            apply: function (target, thisArg, args) {
                let time = target.apply(thisArg, args);
                if (Game.Has('Quick wizards')) time /= 1.1;
                return time;
            }
        })
    }
}

Game.Win("Third-party")
Game.Notify("LMod", "LMod has been added to the game.", [16, 5]);
