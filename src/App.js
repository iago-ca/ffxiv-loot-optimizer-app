import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Main App component
const App = () => {
  // State for the number of weeks to simulate
  const [numWeeks, setNumWeeks] = useState(8);

  // Class lists for each role
  const classLists = useMemo(() => ({
    Tank: ['Dark Knight', 'Warrior', 'Paladin', 'Gunbreaker'],
    Healer: ['Sage', 'Scholar', 'White Mage', 'Astrologian'],
    DPS: ['Monk', 'Samurai', 'Viper', 'Ninja', 'Dragoon', 'Reaper', 'Machinist', 'Dancer', 'Bard', 'Black Mage', 'Pictomancer', 'Summoner', 'Red Mage']
  }), []);

  // State for team composition and player gear status
  // Fixed roles: 2 Tanks, 2 Healers, 4 DPS
  const [players, setPlayers] = useState(
    Array(8).fill(null).map((_, i) => {
      let role = '';
      let roleColor = '';
      let defaultClass = '';
      if (i < 2) { // First 2 players are Tanks
        role = 'Tank';
        roleColor = 'border-blue-400'; // Softer blue border
        defaultClass = classLists.Tank[0];
      } else if (i < 4) { // Next 2 players are Healers
        role = 'Healer';
        roleColor = 'border-green-400'; // Softer green border
        defaultClass = classLists.Healer[0];
      } else { // Remaining 4 players are DPS
        role = 'DPS';
        roleColor = 'border-red-400'; // Softer red border
        defaultClass = classLists.DPS[0];
      }
      return {
        id: i,
        name: `Player ${i + 1}`,
        role: role,
        roleColor: roleColor, // For styling
        selectedClass: defaultClass, // New field for class selection
        gear: {
          head: 'Savage', chest: 'Savage', gloves: 'Savage', pants: 'Savage', boots: 'Savage',
          earring: 'Savage', necklace: 'Savage', bracelet: 'Savage', ring1: 'Tome', ring2: 'Savage' // Default ring types
        },
        manifestos: { page1: 0, page2: 0, page3: 0 }, // Always start from zero
        itemsObtainedCount: 0, // Track items obtained for equitable distribution
      };
    })
  );

  // State for the explicit DPS priority order
  const [dpsOrder, setDpsOrder] = useState([]);

  // State for optimization results (week-by-week breakdown)
  const [results, setResults] = useState(null);
  // State for markdown formatted output
  const [discordOutputMarkdown, setDiscordOutputMarkdown] = useState(null);

  // State for import/export functionality
  const fileInputRef = useRef(null); // Ref for the file input element

  // Effect to initialize DPS order when players change
  useEffect(() => {
    setDpsOrder(players.filter(p => p.role === 'DPS').map(p => p.id));
  }, [players]);

  // Handle player data changes (name or class)
  const handlePlayerChange = (id, field, value) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(player =>
        player.id === id ? { ...player, [field]: value } : player
      )
    );
  };

  // Handle gear type change for a specific player and slot
  const handleGearChange = (playerId, slot, type) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(player =>
        player.id === playerId
          ? { ...player, gear: { ...player.gear, [slot]: type } }
          : player
      )
    );
  };

  // Functions to reorder DPS priority
  const moveDpsUp = (id) => {
    setDpsOrder(prevOrder => {
      const index = prevOrder.indexOf(id);
      if (index > 0) {
        const newOrder = [...prevOrder];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        return newOrder;
      }
      return prevOrder;
    });
  };

  const moveDpsDown = (id) => {
    setDpsOrder(prevOrder => {
      const index = prevOrder.indexOf(id);
      if (index < prevOrder.length - 1) {
        const newOrder = [...prevOrder];
        [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
        return newOrder;
      }
      return prevOrder;
    });
  };

  // Optimization logic
  const optimizeDistribution = useCallback(() => {
    // Deep copy initial player states for simulation
    const currentPlayersState = JSON.parse(JSON.stringify(players));
    // Reset itemsObtainedCount for a fresh simulation
    currentPlayersState.forEach(p => p.itemsObtainedCount = 0);

    const weeklyResults = [];

    // Define page exchange rates
    const pageRates = {
      page1: { type: 'Page #1', cost: 3 },
      page2: { type: 'Page #2', cost: 3 },
      page3: { type: 'Page #3', cost: 4 }
    };

    // Helper to calculate how many upgrade materials a player still needs
    const getNeededUpgradesCount = (player) => {
      const neededGlaze = ['earring', 'necklace', 'bracelet', 'ring1', 'ring2'].filter(slot => player.gear[slot] === 'Tome' && player.gear[slot] !== 'Upgraded' && player.gear[slot] !== 'Upgraded (Page)').length;
      const neededTwine = ['head', 'chest', 'gloves', 'pants', 'boots'].filter(slot => player.gear[slot] === 'Tome' && player.gear[slot] !== 'Upgraded' && player.gear[slot] !== 'Upgraded (Page)').length;
      return neededGlaze + neededTwine;
    };

    // Helper to sort players by priority based on current week
    const getPrioritizedPlayers = (playersList, currentDpsOrder, currentWeek) => {
      return [...playersList].sort((a, b) => {
        // Priority for Glaze/Twine after week 4
        if (currentWeek > 4) {
          const aTotalNeededUpgrades = getNeededUpgradesCount(a);
          const bTotalNeededUpgrades = getNeededUpgradesCount(b);

          if (aTotalNeededUpgrades !== bTotalNeededUpgrades) {
            return bTotalNeededUpgrades - aTotalNeededUpgrades; // More needed = higher priority
          }
        }
        
        // General priority: Role > Items Obtained > DPS Order
        // 1. Role priority (DPS > Tank > Healer)
        const roleOrder = { 'DPS': 1, 'Tank': 2, 'Healer': 3 };
        if (roleOrder[a.role] !== roleOrder[b.role]) {
          return roleOrder[a.role] - roleOrder[b.role];
        }

        // 2. Number of items obtained (fewer items = higher priority within role)
        if (a.itemsObtainedCount !== b.itemsObtainedCount) {
          return a.itemsObtainedCount - b.itemsObtainedCount;
        }

        // 3. DPS priority order if both are DPS
        if (a.role === 'DPS' && b.role === 'DPS') {
          const aIndex = currentDpsOrder.indexOf(a.id);
          const bIndex = currentDpsOrder.indexOf(b.id);
          return aIndex - bIndex;
        }

        // Fallback: Maintain original order for stability if all else is equal
        return 0;
      });
    };

    // Main simulation loop
    for (let week = 1; week <= numWeeks; week++) {
      const currentWeekData = {
        week: week,
        directLootGiven: [],
        pageExchangesMade: [],
        playerManifestosAfterWeek: [],
        playerGearStatusAfterWeek: []
      };

      // --- Fixed Weekly Loot Drops ---
      const fixedWeeklyDrops = {
        floor1: ['earring', 'necklace', 'bracelet', 'ring'],
        floor2: ['head', 'gloves', 'boots', 'glaze'],
        floor3: ['pants', 'chest', 'twine'],
      };

      // --- Accumulate Pages for all players from this week's drops ---
      currentPlayersState.forEach(player => {
        player.manifestos.page1 += 1;
        player.manifestos.page2 += 1;
        player.manifestos.page3 += 1;
      });

      // --- Direct Loot Distribution ---
      const availableDrops = []; // Will store the actual items that dropped this week
      for (const floor in fixedWeeklyDrops) {
        fixedWeeklyDrops[floor].forEach(item => {
          availableDrops.push({ item: item, floor: floor });
        });
      }

      // Loop through each available drop and assign it
      for (const drop of availableDrops) {
        const prioritizedPlayers = getPrioritizedPlayers(currentPlayersState, dpsOrder, week); // Pass current week
        let assignedToPlayer = null;

        for (const player of prioritizedPlayers) {
          let playerNeedsItem = false;
          if (drop.item === 'glaze') {
            playerNeedsItem = (player.gear.earring === 'Tome' && player.gear.earring !== 'Upgraded') ||
                              (player.gear.necklace === 'Tome' && player.gear.necklace !== 'Upgraded') ||
                              (player.gear.bracelet === 'Tome' && player.gear.bracelet !== 'Upgraded') ||
                              (player.gear.ring1 === 'Tome' && player.gear.ring1 !== 'Upgraded') ||
                              (player.gear.ring2 === 'Tome' && player.gear.ring2 !== 'Upgraded');
          } else if (drop.item === 'twine') {
            playerNeedsItem = (player.gear.head === 'Tome' && player.gear.head !== 'Upgraded') ||
                              (player.gear.gloves === 'Tome' && player.gear.gloves !== 'Upgraded') ||
                              (player.gear.boots === 'Tome' && player.gear.boots !== 'Upgraded') ||
                              (player.gear.pants === 'Tome' && player.gear.pants !== 'Upgraded') ||
                              (player.gear.chest === 'Tome' && player.gear.chest !== 'Upgraded');
          } else if (drop.item === 'ring') {
            playerNeedsItem = (player.gear.ring1 === 'Savage' && player.gear.ring1 !== 'Obtained') ||
                              (player.gear.ring2 === 'Savage' && player.gear.ring2 !== 'Obtained');
          } else {
            playerNeedsItem = player.gear[drop.item] === 'Savage' && player.gear[drop.item] !== 'Obtained';
          }

          if (playerNeedsItem) {
            assignedToPlayer = player;
            break;
          }
        }

        if (assignedToPlayer) {
          currentWeekData.directLootGiven.push({ player: assignedToPlayer.name, item: drop.item, floor: drop.floor });
          assignedToPlayer.itemsObtainedCount++;

          // Update player's gear status
          if (drop.item === 'glaze') {
            const tomeAccessorySlots = ['earring', 'necklace', 'bracelet', 'ring1', 'ring2'];
            for (const slot of tomeAccessorySlots) {
              if (assignedToPlayer.gear[slot] === 'Tome' && assignedToPlayer.gear[slot] !== 'Upgraded') {
                assignedToPlayer.gear[slot] = 'Upgraded';
                break;
              }
            }
          } else if (drop.item === 'twine') {
            const tomeArmorSlots = ['head', 'gloves', 'boots', 'pants', 'chest'];
            for (const slot of tomeArmorSlots) {
              if (assignedToPlayer.gear[slot] === 'Tome' && assignedToPlayer.gear[slot] !== 'Upgraded') {
                assignedToPlayer.gear[slot] = 'Upgraded';
                break;
              }
            }
          } else if (drop.item === 'ring') {
              if (assignedToPlayer.gear.ring1 === 'Savage' && assignedToPlayer.gear.ring1 !== 'Obtained') {
                assignedToPlayer.gear.ring1 = 'Obtained';
              } else if (assignedToPlayer.gear.ring2 === 'Savage' && assignedToPlayer.gear.ring2 !== 'Obtained') {
                assignedToPlayer.gear.ring2 = 'Obtained';
              }
          } else {
            assignedToPlayer.gear[drop.item] = 'Obtained';
          }
        } else {
          // No one needs this item, assign to FFA
          currentWeekData.directLootGiven.push({ player: 'FFA', item: drop.item, floor: drop.floor });
        }
      }

      // --- Page Exchange ---
      const prioritizedPlayersForPages = getPrioritizedPlayers(currentPlayersState, dpsOrder, week); // Pass current week

      // Forced Page Exchanges based on week
      // Week 3: Force Page #1 for Accessory
      if (week === 3) {
        for (const player of prioritizedPlayersForPages) {
          const neededSavageAccessories = ['earring', 'necklace', 'bracelet', 'ring1', 'ring2'].filter(slot => player.gear[slot] === 'Savage' && player.gear[slot] !== 'Obtained' && player.gear[slot] !== 'Obtained (Page)');
          if (neededSavageAccessories.length > 0 && player.manifestos.page1 >= pageRates.page1.cost) {
            const itemToGet = neededSavageAccessories[0];
            currentWeekData.pageExchangesMade.push({
              player: player.name, type: pageRates.page1.type, item: itemToGet, cost: pageRates.page1.cost
            });
            player.manifestos.page1 -= pageRates.page1.cost;
            player.gear[itemToGet] = 'Obtained (Page)';
            player.itemsObtainedCount++;
          }
        }
      }

      // Week 3 & 6: Force Page #2 for Glaze
      if (week === 3 || week === 6) {
        for (const player of prioritizedPlayersForPages) {
          const needsGlaze = ['earring', 'necklace', 'bracelet', 'ring1', 'ring2'].some(slot => player.gear[slot] === 'Tome' && player.gear[slot] !== 'Upgraded' && player.gear[slot] !== 'Upgraded (Page)');
          if (needsGlaze && player.manifestos.page2 >= pageRates.page2.cost) {
            currentWeekData.pageExchangesMade.push({
              player: player.name, type: pageRates.page2.type, item: 'glaze', cost: pageRates.page2.cost
            });
            player.manifestos.page2 -= pageRates.page2.cost;
            player.itemsObtainedCount++;
            const tomeAccessorySlots = ['earring', 'necklace', 'bracelet', 'ring1', 'ring2'];
            for (const slot of tomeAccessorySlots) {
              if (player.gear[slot] === 'Tome' && player.gear[slot] !== 'Upgraded') {
                player.gear[slot] = 'Upgraded (Page)';
                break;
              }
            }
          }
        }
      }

      // Week 4 & 8: Force Page #3 for Twine
      if (week === 4 || week === 8) {
        for (const player of prioritizedPlayersForPages) {
          const needsTwine = ['head', 'gloves', 'boots', 'pants', 'chest'].some(slot => player.gear[slot] === 'Tome' && player.gear[slot] !== 'Upgraded' && player.gear[slot] !== 'Upgraded (Page)');
          if (needsTwine && player.manifestos.page3 >= pageRates.page3.cost) {
            currentWeekData.pageExchangesMade.push({
              player: player.name, type: pageRates.page3.type, item: 'twine', cost: pageRates.page3.cost
            });
            player.manifestos.page3 -= pageRates.page3.cost;
            player.itemsObtainedCount++;
            const tomeArmorSlots = ['head', 'gloves', 'boots', 'pants', 'chest'];
            for (const slot of tomeArmorSlots) {
              if (player.gear[slot] === 'Tome' && player.gear[slot] !== 'Upgraded') {
                player.gear[slot] = 'Upgraded (Page)';
                break;
              }
            }
          }
        }
      }

      // Store final state for this week
      currentWeekData.playerManifestosAfterWeek = currentPlayersState.map(p => ({
        id: p.id,
        name: p.name,
        manifestos: { ...p.manifestos }
      }));
      currentWeekData.playerGearStatusAfterWeek = currentPlayersState.map(p => ({
        id: p.id,
        name: p.name,
        gear: { ...p.gear }
      }));

      weeklyResults.push(currentWeekData);
    }
    setResults(weeklyResults);
  }, [numWeeks, players, dpsOrder]);

  // Mapping for display names
  const itemDisplayNames = useMemo(() => ({
    earring: 'Earring', necklace: 'Necklace', bracelet: 'Bracelet', ring: 'Ring',
    head: 'Head', gloves: 'Gloves', boots: 'Boots',
    pants: 'Pants', chest: 'Chest',
    glaze: 'Glaze',
    twine: 'Twine',
    page1: 'Page #1', page2: 'Page #2', page3: 'Page #3',
    ring1: 'Ring 1', ring2: 'Ring 2'
  }), []);

  // Function to generate Discord markdown output
  const generateDiscordMarkdown = useCallback(() => {
    if (!results) return '';

    let markdown = `# FFXIV Raid Loot Optimization Results\n\n`;

    results.forEach(weekData => {
      markdown += `## Week ${weekData.week}\n`; // Removed extra newline

      const floor1Items = ['earring', 'necklace', 'bracelet', 'ring'];
      const floor2Items = ['head', 'gloves', 'boots', 'glaze'];
      const floor3Items = ['pants', 'chest', 'twine'];

      markdown += `### Floor 1:\n`; // Removed extra newline
      floor1Items.forEach(itemType => {
        const recipient = weekData.directLootGiven.find(d => d.item === itemType && d.floor === 'floor1')?.player || 'FFA';
        markdown += `- ${itemDisplayNames[itemType] || itemType}: ${recipient}\n`;
      });
      markdown += `\n`; // Keep one newline for spacing between floors

      markdown += `### Floor 2:\n`; // Removed extra newline
      floor2Items.forEach(itemType => {
        const recipient = weekData.directLootGiven.find(d => d.item === itemType && d.floor === 'floor2')?.player || 'FFA';
        markdown += `- ${itemDisplayNames[itemType] || itemType}: ${recipient}\n`;
      });
      markdown += `\n`; // Keep one newline

      markdown += `### Floor 3:\n`; // Removed extra newline
      floor3Items.forEach(itemType => {
        const recipient = weekData.directLootGiven.find(d => d.item === itemType && d.floor === 'floor3')?.player || 'FFA';
        markdown += `- ${itemDisplayNames[itemType] || itemType}: ${recipient}\n`;
      });
      markdown += `\n`; // Keep one newline

      markdown += `### Page Exchanges:\n`; // Removed extra newline
      if (weekData.pageExchangesMade.length > 0) {
        weekData.pageExchangesMade.forEach(res => {
          // Format: Item: Player (Cost Type)
          markdown += `- ${itemDisplayNames[res.item] || res.item}: **${res.player}** (${res.cost} ${res.type})\n`;
        });
      } else {
        markdown += `_No page exchanges made this week._\n`;
      }
      markdown += `\n---\n\n`;
    });

    setDiscordOutputMarkdown(markdown);
  }, [results, itemDisplayNames]);

  // Effect to generate markdown when results are available
  useEffect(() => {
    if (results) {
      generateDiscordMarkdown();
    }
  }, [results, generateDiscordMarkdown]);

  // Handle file selection for import
  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.players && Array.isArray(importedData.players) && importedData.players.length === 8) {
          // Create a temporary map for imported players to easily look up by original ID
          const importedPlayersMap = new Map(importedData.players.map(p => [p.id, p]));

          // Reconstruct players array, ensuring consistent IDs (0-7) and default values
          const newPlayers = Array(8).fill(null).map((_, index) => {
            const importedPlayer = importedPlayersMap.get(index) || importedData.players[index]; // Try by ID, then by index if ID not found
            
            let role = '';
            let roleColor = '';
            if (index < 2) {
              role = 'Tank';
              roleColor = 'border-blue-400';
            } else if (index < 4) {
              role = 'Healer';
              roleColor = 'border-green-400';
            } else {
              role = 'DPS';
              roleColor = 'border-red-400';
            }

            return {
              id: index, // Ensure IDs are consistent (0-7)
              name: importedPlayer?.name || `Player ${index + 1}`,
              role: role, // Force role based on index
              roleColor: roleColor, // Force color based on index
              selectedClass: importedPlayer?.selectedClass || classLists[role][0],
              gear: {
                head: importedPlayer?.gear?.head || 'Savage',
                chest: importedPlayer?.gear?.chest || 'Savage',
                gloves: importedPlayer?.gear?.gloves || 'Savage',
                pants: importedPlayer?.gear?.pants || 'Savage',
                boots: importedPlayer?.gear?.boots || 'Savage',
                earring: importedPlayer?.gear?.earring || 'Savage',
                necklace: importedPlayer?.gear?.necklace || 'Savage',
                bracelet: importedPlayer?.gear?.bracelet || 'Savage',
                ring1: importedPlayer?.gear?.ring1 || 'Tome',
                ring2: importedPlayer?.gear?.ring2 || 'Savage'
              },
              manifestos: { page1: 0, page2: 0, page3: 0 },
              itemsObtainedCount: 0,
            };
          });
          setPlayers(newPlayers);

          // Re-initialize DPS order based on the newPlayers array's IDs
          const newDpsOrder = newPlayers.filter(p => p.role === 'DPS').map(p => p.id);
          // If importedData.dpsOrder exists, try to map old IDs to new IDs
          if (importedData.dpsOrder && Array.isArray(importedData.dpsOrder)) {
            const remappedDpsOrder = importedData.dpsOrder
              .map(oldId => newPlayers.find(p => p.name === importedPlayersMap.get(oldId)?.name)?.id)
              .filter(id => id !== undefined); // Filter out any IDs that couldn't be remapped
            
            // If remapping was successful for all original DPS, use it. Otherwise, use the default newDpsOrder.
            if (remappedDpsOrder.length === newDpsOrder.length) {
              setDpsOrder(remappedDpsOrder);
            } else {
              console.warn("Could not fully remap DPS priority order. Using default DPS order.");
              setDpsOrder(newDpsOrder); // Fallback to default if remapping is incomplete
            }
          } else {
            setDpsOrder(newDpsOrder);
          }

          console.log('Team configuration imported successfully!');
          alert('Team configuration imported successfully!');

        } else {
          console.error('Invalid JSON structure for team configuration or incorrect number of players (expected 8).');
          alert('Invalid JSON structure for team configuration or incorrect number of players (expected 8).');
        }
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        alert('Error parsing JSON file.');
      } finally {
        // It's crucial to clear the file input value to allow re-importing the same file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  }, [classLists]);

  // Export team configuration to JSON
  const exportConfig = useCallback(() => {
    console.log("Attempting to export config...");
    const configToExport = players.map(player => ({
      id: player.id,
      name: player.name,
      role: player.role,
      selectedClass: player.selectedClass, // Include selectedClass
      gear: player.gear,
      // manifestos and itemsObtainedCount are reset on optimize, so no need to export them
    }));
    const dpsPriorityToExport = dpsOrder;

    const exportData = {
      players: configToExport,
      dpsOrder: dpsPriorityToExport,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ffxiv_team_config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Export initiated.");
  }, [players, dpsOrder]);


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-inter">
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
        `}
      </style>
      <div className="container mx-auto max-w-full rounded-lg shadow-xl p-6 md:p-8"> {/* Changed max-w-6xl to max-w-full */}
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-400">
          FFXIV Raid Loot Optimizer
        </h1>

        {/* Team Configuration Section */}
        <section className="mb-10 p-6 bg-gray-700 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-6 text-blue-300">Team Configuration (8 Players)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6"> {/* Adjusted grid to 4 columns on large screens */}
            {players.map(player => (
              <div key={player.id} className={`bg-gray-800 p-5 rounded-lg shadow-inner border-2 ${player.roleColor}`}> {/* Border for role color */}
                <div className="flex items-center space-x-3 mb-4">
                  {/* Class sprite placeholder */}
                  <img
                    src={`${process.env.PUBLIC_URL}/job_icons/${player.selectedClass.toLowerCase().replace(/\s/g, '')}.png`}
                    alt={`${player.selectedClass} icon`}
                    className="w-16 h-16 flex-shrink-0" // Adjusted size, removed rounded-full and border
                    onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/64x64/transparent/white?text=?" }} // Fallback for placeholder
                  />
                  <div className="flex-grow">
                    <label htmlFor={`player-name-${player.id}`} className="block text-sm font-medium text-gray-300 mb-1">Player Name</label>
                    <input
                      type="text"
                      id={`player-name-${player.id}`}
                      value={player.name}
                      onChange={(e) => handlePlayerChange(player.id, 'name', e.target.value)}
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-white"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label htmlFor={`player-job-${player.id}`} className="block text-sm font-medium text-gray-300 mb-1">Job</label>
                  <select
                    id={`player-job-${player.id}`}
                    value={player.selectedClass}
                    onChange={(e) => handlePlayerChange(player.id, 'selectedClass', e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-white"
                  >
                    {classLists[player.role].sort().map(cls => ( // Sorted alphabetically
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>


                {/* Gear Slots */}
                <div className="mb-4">
                  <h4 className="text-md font-medium mb-2 text-gray-300">Desired Gear Type</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2"> {/* Adjusted gap for better spacing */}
                    {/* Left Column: Armor */}
                    <div className="flex flex-col space-y-2">
                      {['head', 'chest', 'gloves', 'pants', 'boots'].map(slot => (
                        <div key={slot} className="flex items-center justify-between">
                          <span className="capitalize text-gray-400 text-sm mr-2 flex-grow">{itemDisplayNames[slot] || slot}</span> {/* Added flex-grow */}
                          <select
                            value={player.gear[slot]}
                            onChange={(e) => handleGearChange(player.id, slot, e.target.value)}
                            className="p-1 bg-gray-900 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-white text-sm flex-shrink-0" // Added flex-shrink-0
                          >
                            <option value="Savage">Savage</option>
                            <option value="Tome">Tome</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    {/* Right Column: Accessories */}
                    <div className="flex flex-col space-y-2">
                      {['earring', 'necklace', 'bracelet', 'ring1', 'ring2'].map(slot => (
                        <div key={slot} className="flex items-center justify-between">
                          <span className="capitalize text-gray-400 text-sm mr-2 flex-grow">{itemDisplayNames[slot] || slot}</span> {/* Added flex-grow */}
                          <select
                            value={player.gear[slot]}
                            onChange={(e) => handleGearChange(player.id, slot, e.target.value)}
                            className="p-1 bg-gray-900 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-white text-sm flex-shrink-0" // Added flex-shrink-0
                          >
                            <option value="Savage">Savage</option>
                            <option value="Tome">Tome</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Import/Export Configuration */}
        <section className="mb-10 p-6 bg-gray-700 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-6 text-blue-300">Import/Export Configuration</h2>
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6">
            <button
              onClick={exportConfig}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50 w-full md:w-auto" /* Added w-full md:w-auto */
            >
              Export Team Config (JSON)
            </button>
            {/* Styled Import Button triggering hidden file input */}
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden" // Keep the actual input hidden
            />
            <button
              onClick={() => fileInputRef.current.click()} // This button triggers the hidden input
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50 w-full md:w-auto"
            >
              Import Team Config
            </button>
          </div>
        </section>


        {/* DPS Priority Section */}
        <section className="mb-10 p-6 bg-gray-700 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-6 text-blue-300">DPS Priority</h2>
          <div className="flex flex-col md:flex-row items-start md:space-x-6 space-y-4 md:space-y-0">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                DPS Priority Order (Most to Least Priority)
              </label>
              <ul className="bg-gray-800 p-3 rounded-md border border-gray-600">
                {dpsOrder.map((dpsId, index) => {
                  const dpsPlayer = players.find(p => p.id === dpsId);
                  return (
                    <li key={dpsId} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                      <span className="text-gray-200">{index + 1}. {dpsPlayer ? dpsPlayer.name : 'Removed DPS'}</span>
                      <div className="space-x-2">
                        <button
                          onClick={() => moveDpsUp(dpsId)}
                          disabled={index === 0}
                          className="p-1 rounded-md bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white"
                          title="Move Up"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveDpsDown(dpsId)}
                          disabled={index === dpsOrder.length - 1}
                          className="p-1 rounded-md bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white"
                          title="Move Down"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
                {dpsOrder.length === 0 && <li className="text-gray-400">No DPS configured.</li>}
              </ul>
            </div>
          </div>
        </section>

        {/* Number of Weeks Section */}
        <section className="mb-10 p-6 bg-gray-700 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-6 text-blue-300">Multi-Week Simulation</h2>
          <div className="flex flex-col md:flex-row items-center md:space-x-6 space-y-4 md:space-y-0">
            <div className="flex-1 w-full">
              <label htmlFor="num-weeks" className="block text-sm font-medium text-gray-300 mb-1">
                Number of Weeks to Simulate
              </label>
              <input
                type="number"
                id="num-weeks"
                value={numWeeks}
                onChange={(e) => setNumWeeks(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-white"
                min="1"
              />
            </div>
          </div>
        </section>

        {/* Optimize Button */}
        <div className="text-center mb-10">
          <button
            onClick={optimizeDistribution}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Optimize Multi-Week Distribution
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <section className="p-6 bg-gray-700 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-6 text-green-300">Optimization Results (Per Week)</h2>
            {results.map(weekData => (
              <div key={weekData.week} className="mb-10 p-5 bg-gray-800 rounded-lg shadow-inner border border-gray-600">
                <h3 className="text-xl font-bold mb-4 text-blue-300">Week {weekData.week}</h3>

                {/* Direct Loot Distributed */}
                <div className="mb-4">
                  <h4 className="text-lg font-medium mb-2 text-gray-200">Direct Loot Distributed:</h4>

                  <h5 className="text-md font-medium mb-1 text-gray-300">Floor 1:</h5>
                  {/* Iterate through expected items for Floor 1 to ensure all are listed */}
                  {['earring', 'necklace', 'bracelet', 'ring'].map(itemType => {
                    const assignedLoot = weekData.directLootGiven.find(d => d.item === itemType && d.floor === 'floor1');
                    const recipient = assignedLoot ? assignedLoot.player : 'FFA';
                    return (
                      <ul key={`f1-item-${itemType}`} className="list-disc list-inside space-y-1 text-gray-300 ml-4">
                        <li>
                          <span className="font-semibold text-green-300">{itemDisplayNames[itemType] || itemType}</span>: <span className="font-semibold text-blue-300">{recipient}</span>
                        </li>
                      </ul>
                    );
                  })}
                  <br/>

                  <h5 className="text-md font-medium mb-1 text-gray-300">Floor 2:</h5>
                  {/* Iterate through expected items for Floor 2 */}
                  {['head', 'gloves', 'boots', 'glaze'].map(itemType => {
                    const assignedLoot = weekData.directLootGiven.find(d => d.item === itemType && d.floor === 'floor2');
                    const recipient = assignedLoot ? assignedLoot.player : 'FFA';
                    return (
                      <ul key={`f2-item-${itemType}`} className="list-disc list-inside space-y-1 text-gray-300 ml-4">
                        <li>
                          <span className="font-semibold text-green-300">{itemDisplayNames[itemType] || itemType}</span>: <span className="font-semibold text-blue-300">{recipient}</span>
                        </li>
                      </ul>
                    );
                  })}
                  <br/>

                  <h5 className="text-md font-medium mb-1 text-gray-300">Floor 3:</h5>
                  {/* Iterate through expected items for Floor 3 */}
                  {['pants', 'chest', 'twine'].map(itemType => {
                    const assignedLoot = weekData.directLootGiven.find(d => d.item === itemType && d.floor === 'floor3');
                    const recipient = assignedLoot ? assignedLoot.player : 'FFA';
                    return (
                      <ul key={`f3-item-${itemType}`} className="list-disc list-inside space-y-1 text-gray-300 ml-4">
                        <li>
                          <span className="font-semibold text-green-300">{itemDisplayNames[itemType] || itemType}</span>: <span className="font-semibold text-blue-300">{recipient}</span>
                        </li>
                      </ul>
                    );
                  })}
                </div>

                {/* Page Exchanges Made */}
                <div className="mb-4">
                  <h4 className="text-lg font-medium mb-2 text-gray-200">Page Exchanges Made:</h4>
                  {weekData.pageExchangesMade.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                      {weekData.pageExchangesMade.map((res, index) => (
                        <li key={`page-${weekData.week}-${index}`}>
                          <span className="font-semibold text-green-300">{itemDisplayNames[res.item] || res.item}</span>: <span className="font-semibold text-blue-300">{res.player}</span> ({res.cost} {res.type})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No page exchanges made this week.</p>
                  )}
                </div>

                {/* Player Pages After Week (Re-added for UI, not Discord output) */}
                <div className="mb-4">
                  <h4 className="text-lg font-medium mb-2 text-gray-200">Player Pages After Week:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {weekData.playerManifestosAfterWeek.map(player => (
                      <li key={`manifestos-${weekData.week}-${player.id}`}>
                        <span className="font-semibold text-blue-300">{player.name}</span>:
                        Page #1: {player.manifestos.page1},
                        Page #2: {player.manifestos.page2},
                        Page #3: {player.manifestos.page3}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Player Gear Status After Week (Re-added for UI, not Discord output) */}
                <div>
                  <h4 className="text-lg font-medium mb-2 text-gray-200">Player Gear Status:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {weekData.playerGearStatusAfterWeek.map(player => (
                      <li key={`gear-${weekData.week}-${player.id}`}>
                        <span className="font-semibold text-blue-300">{player.name}</span>:
                        {Object.entries(player.gear).map(([slot, status]) => (
                          <span key={slot} className="ml-2">
                            {itemDisplayNames[slot] || slot}: <span className={`font-medium ${status === 'Obtained' || status === 'Upgraded' || status === 'Obtained (Page)' || status === 'Upgraded (Page)' ? 'text-green-400' : 'text-yellow-400'}`}>{status}</span>
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
            {discordOutputMarkdown && (
              <div className="mt-8 p-5 bg-gray-800 rounded-lg shadow-inner border border-gray-600">
                <h3 className="text-xl font-bold mb-4 text-purple-300">Discord Markdown Output</h3>
                <textarea
                  readOnly
                  value={discordOutputMarkdown}
                  className="w-full h-80 bg-gray-900 border border-gray-600 rounded-md p-3 text-white font-mono text-sm resize-y"
                  aria-label="Discord Markdown Output"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(discordOutputMarkdown)
                      .then(() => {
                        // In a real app, you'd show a success message to the user
                        console.log('Copied to clipboard!');
                      })
                      .catch(err => {
                        console.error('Failed to copy: ', err);
                        // Fallback for older browsers or if clipboard.writeText fails
                        const textarea = document.querySelector('textarea[aria-label="Discord Markdown Output"]');
                        if (textarea) {
                          textarea.select();
                          document.execCommand('copy');
                          console.log('Copied using execCommand!');
                        }
                      });
                  }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default App;
