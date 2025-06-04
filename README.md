# FFXIV Raid Loot Optimizer

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)  ![YAML](https://img.shields.io/badge/YAML-CB171E?style=for-the-badge&logo=yaml&logoColor=white)

![GitHub Actions Workflow Status](https://github.com/iago-ca/ffxiv-loot-optimizer-app/actions/workflows/deploy.yml/badge.svg) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Online-blue?style=flat-square)

An intuitive web tool designed to help Final Fantasy XIV raid teams optimize Savage loot distribution over multiple weeks, aiming to efficiently and fairly gear up all team members.

## Overview

Loot optimization in FFXIV raids can be complex, especially when coordinating direct item drops and page exchanges. This application simulates loot distribution over a configurable number of weeks, applying priority rules to ensure all team members obtain their desired gear by Week 8.

## Features

- Team Configuration: Set the name and Job (class) for each of the 8 team members (2 Tanks, 2 Healers, 4 DPS).
- Desired Gear Priority: For each gear slot (head, chest, accessories, etc.), select whether the player desires a "Savage" item (direct raid drop) or a "Tome" item (which requires an upgrade material like Glaze or Twine).
- Customizable DPS Priority: Order your DPS players by desired priority, ensuring loot is distributed fairly but with a slight advantage for prioritized DPS.
- Multi-Week Simulation: Simulate loot distribution for up to 8 weeks, considering fixed weekly drops and individual page accumulation.
- Intelligent Optimization Logic:
  - Upgrade Material Priority: After Week 4, the logic prioritizes players who need more Glazes and Twines to complete their gear, even if it means a DPS or Tank might wait a bit longer for a direct item drop. The goal is to gear up the entire team by Week 8.
  - Equitable Distribution: Within each role (Tanks, Healers, DPS), loot is distributed to those who have obtained fewer valuable items, preventing a single player from hoarding loot and ensuring everyone progresses similarly.
  - Page Usage: The system suggests page exchanges in specific weeks (Week 3 for accessories, Weeks 3 and 6 for Glaze, Weeks 4 and 8 for Twine) to accelerate the gearing process.
- Export/Import Configurations: Save your team's configuration to a JSON file for easy sharing and reusability.
- Discord-Formatted Output: Generate a concise, Markdown-formatted summary of the weekly loot distribution, ready to be copied and pasted into Discord channels.
- Job Icons: Visual display of selected Job icons for a better user experience.

## How to Use

- Configure Your Team:
  - Enter the names of your 8 players. Roles (Tank, Healer, DPS) are pre-defined.
  - For each player, select their correct Job from the dropdown.
  - For each gear slot, choose if the player desires a Savage item (direct drop) or a Tome item (requires upgrade material).
- Set DPS Priority:
  - In the "DPS Priority" section, drag and drop DPS players to define their priority order (most to least prioritized).
- Number of Weeks:
  - Set how many weeks you want to simulate the distribution (default is 8, since that's the maximum amount you'd need to get everyone a weapon, and the minimum amount to get everyone the mount and orchestrion roll).
- Optimize Distribution:
  - Click the "Optimize Multi-Week Distribution" button.
- View Results:
  - Weekly results will be displayed on screen, showing who gets what.
- Export/Import Configuration:
  - Use the "Export Team Config" button to save your current team's state.
  - Use the file input and "Import Team Config" button to load a saved configuration (select the JSON file).
- Share on Discord:
  - After optimization, copy the content from the "Discord Markdown Output" box and paste a simplified overview of loot distribution directly into your Discord channel.
