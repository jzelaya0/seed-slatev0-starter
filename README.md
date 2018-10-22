# Seed Theme Developement
---

### Requirements
---
1. Node [v6.x] (https://nodejs.org/en/)
2. Shopify Slate [v0] (https://shopify.github.io/slate/)

### Usage
---
1. Download a copy of this repo and move it into your workspace
2. Install necessary packages ```$ npm install ```
3. Run slate build ```$ slate build ```
4. Run slate zip ```$ slate zip ```
5. Upload the **slate-starer.zip** file in the shop admin
6. Create a new private app with theme template & assets permissions
7. Create a new config.yml file ``` $ touch config.yml```
8. Copy contents from *config-example.yml* into *config.yml*
9. Plugin private app credentials and the newly created theme's id
10. Run ```$ slate watch``` to start development environment
