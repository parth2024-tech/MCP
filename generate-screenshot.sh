#!/bin/bash

# Clear the screen for a clean screenshot
clear

echo -e "\n\033[1;36m[ASE MCP Server]\033[0m Intercepting AI code generation payload..."
sleep 0.3

echo -e "\033[1;34m[Context Budget]\033[0m Running Xenova/all-MiniLM-L6-v2 semantic embedding engine..."
sleep 0.4
echo -e "  ↳ Retrieved context: \033[1;32mnextjs_server_components\033[0m, \033[1;32mstrict_typescript\033[0m"
sleep 0.2

echo -e "\033[1;35m[Orchestrator]\033[0m Spawning parallel validation pipeline..."
sleep 0.5

echo -e "  \033[1;32m[✓] ESLint\033[0m \033[2m(14ms)\033[0m"
sleep 0.2
echo -e "  \033[1;31m[✗] TypeScript Checker\033[0m \033[2m(42ms)\033[0m"
sleep 0.3

echo -e "\n\033[1;41m\033[1;37m CRITICAL: CONSTRAINT VIOLATION DETECTED \033[0m"
echo -e "\033[31m  Error:\033[0m Project rule broken in generated output."
echo -e "\033[31m  Detail:\033[0m \033[3m'any' type used in data-fetching function (Rule #4: No 'any' types permitted)\033[0m"
echo -e "\033[31m  File:\033[0m \033[4msrc/app/dashboard/page.tsx:22\033[0m"

echo -e "\n\033[1;33m[Action]\033[0m Output fully blocked from editor."
sleep 0.4
echo -e "\033[1;33m[Action]\033[0m Pushing error trace back to AI host for invisible self-correction loop...\n"
