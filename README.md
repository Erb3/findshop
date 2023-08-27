# FindShop
FindShop is a SwitchCraft service providing an easy way to search for compatible shops implementing the [ShopSync](https://p.sc3.io/7Ae4KxgzAM) protocol.
Valid command aliases are `\fs`, `\find` or `\findshop`.

## Subcommands
### Buy
```
\fs buy <item>
```
Finds shops with `<item>` and returns the shop name, location, item price & quantity in stock. The buy keyword is optional: if no subcommand is specified, buy is inferred.
### Sell
```
\fs sell <item>
```
Finds shops buying `<item>` and returns the shop name, location and item price.
### Shop Details
```
\fs shop <name> [page]
```
Finds shops with `<name>` and returns the owner, location, and other statistics. If multiple results are found, a list of results with page numbers will be shown.
### Stats
```
\fs stats
```
Redirects to a publicly available statistics dashboard located [here](https://charts.mongodb.com/charts-findshop-lwmvk/public/dashboards/649f2873-58ae-45ef-8079-03201394a531).
### List
```
\fs list [page]
```
Lists all available shops.
