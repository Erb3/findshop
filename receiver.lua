settings.define("findshop.wstoken", {
  type = "string",
  default = ""
})

settings.define("findshop.wsserver", {
  type = "string",
  default = ""
})

settings.define("findshop.port", {
  type = "number",
  default = 9773
})

settings.save()

local WSSERVER = settings.get("findshop.wsserver") or ""
local TOKEN = settings.get("findshop.wstoken") or ""
local PORT = settings.get("findshop.port") or 9773

if #WSSERVER == 0 then
  error("WS server URL must be specified at findshop.wsserver")
end

if #TOKEN == 0 then
  error("Token must be specified at findshop.wstoken")
end

local modem = peripheral.find("modem") or error("Modem not found")

if not modem.isWireless() then
  printError("Modem is not wireless, this could be an issue, continuing")
end

modem.open(PORT)

local function chktype(var, ...)
  --print("chktype", var, ...)
  for _, v in ipairs({ ... }) do
    if type(var) == v then
      return true
    end
  end
  return false
end

local function tassert(var, ...)
  --print("tassert", var, ...)
  if chktype(var, ...) then
    return var
  end
  error("assertion failed!")
end

local function check(msg)
  assert(msg.type == "ShopSync")

  tassert(msg.info, "table")
  tassert(msg.info.name, "string")
  tassert(msg.info.description, "string", "nil")
  tassert(msg.info.owner, "string", "nil")
  tassert(msg.info.computerID, "number")
  tassert(msg.info.multiShop, "number", "nil")
  tassert(msg.info.software, "table", "nil")
  if msg.info.software then
    tassert(msg.info.software.name, "string", "nil")
    tassert(msg.info.software.version, "string", "nil")
  end
  tassert(msg.info.location, "table", "nil")
  if msg.info.location then
    tassert(msg.info.location.coordinates, "table", "nil")
    if msg.info.location.coordinates then
      assert(#msg.info.location.coordinates == 3 or #msg.info.location.coordinates == 0)
      if #msg.info.location.coordinates == 3 then
        for i = 1, 3 do
          tassert(msg.info.location.coordinates[i], "number")
        end
      else
        msg.info.location.coordinates = nil
      end
    end
    tassert(msg.info.location.description, "string", "nil")
    msg.info.location.dimension = tassert(msg.info.location.dimension, "string", "nil"):lower()
  end
  tassert(msg.info.otherLocations, "table", "nil")
  if msg.info.otherLocations then
    for _, v in ipairs(msg.info.otherLocations) do
      tassert(v, "table")
      tassert(v.coordinates, "table", "nil")
      if v.coordinates then
        assert(#v.coordinates == 3)
        for i = 1, 3 do
          tassert(v.coordinates[i], "number")
        end
      end
      tassert(v.description, "string", "nil")
      tassert(v.dimension, "string", "nil")
    end
  end

  tassert(msg.items, "table")
  for _, v in ipairs(msg.items) do
    tassert(v, "table")
    tassert(v.prices, "table")
    for _, v2 in ipairs(v.prices) do
      tassert(v2, "table")
      tassert(v2.value, "number")
      tassert(v2.currency, "string")
      tassert(v2.address, "string")
      tassert(v2.requiredMeta, "string", "nil")
    end
    tassert(v.item, "table")
    tassert(v.item.name, "string")
    tassert(v.item.nbt, "string", "nil")
    tassert(v.item.displayName, "string")
    v.dynamicPrice = tassert(v.dynamicPrice, "boolean", "nil") or false
    tassert(v.stock, "number", "nil")
    v.madeOnDemand = tassert(v.madeOnDemand, "boolean", "nil") or false
    v.requiresInteraction = tassert(v.requiresInteraction, "boolean", "nil") or false
    v.shopBuysItem = tassert(v.shopBuysItem, "boolean", "nil") or false
    v.noLimit = tassert(v.noLimit, "boolean", "nil") or false
  end
end

local function wsify(msg)
  local ret = {}

  ret["type"] = "shop"
  ret["shopName"] = msg.info.name
  ret["shopDescription"] = msg.info.description
  ret["owner"] = msg.info.owner
  ret["computerID"] = msg.info.computerID
  ret["multiShop"] = msg.info.multiShop

  if msg.info.software then
    ret["softwareName"] = msg.info.software.name
    ret["softwareVersion"] = msg.info.software.version
  end

  if msg.info.location then
    ret["mainLocation"] = {}
    if msg.info.location.coordinates then
      ret["mainLocation"]["x"] = msg.info.location.coordinates[1]
      ret["mainLocation"]["y"] = msg.info.location.coordinates[2]
      ret["mainLocation"]["z"] = msg.info.location.coordinates[3]
      ret["mainLocation"]["description"] = msg.info.location.description
      ret["mainLocation"]["dimension"] = msg.info.location.dimension
    end
  end

  ret["items"] = {}
  for _, v in ipairs(msg.items) do
    local t = {}
    t["itemID"] = v.item.name
    t["displayName"] = v.item.displayName
    t["dynamicPrice"] = v.dynamicPrice
    t["madeOnDemand"] = v.madeOnDemand
    t["stock"] = v.stock
    t["requiresInteraction"] = v.requiresInteraction
    t["isBuyingItem"] = v.shopBuysItem
    t["noLimit"] = v.noLimit

    for _, v in ipairs(v.prices) do
      if v.currency:upper() == "KST" then
        t["kstPrice"] = v.value
      elseif v.currency:upper() == "TST" then
        t["tstPrice"] = v.value
      end
    end

    table.insert(ret["items"], t)
  end

  return ret
end

local function receive()
  while true do
    local event, side, channel, replyChannel, msg, distance = os.pullEvent("modem_message")

    if channel == PORT then
      if type(msg) == "table" and type(msg.info) == "table" then
        msg.info.computerID = msg.info.computerID or replyChannel
      end

      local ok, err = pcall(check, msg)
      if not ok then print(err) end
      return ok, msg
    end
  end
end

while true do
  local s,e = pcall(function()
    local ws, err = http.websocket({
      url = WSSERVER,
      headers = { ["Authorization"] = TOKEN },
      timeout = 5
    })

    if not ws then
      error("Failed to connect to WS: " .. err)
    else
      print("Connected to WS")
    end

    while true do
      local ok, msg = receive()

      if ok then
        print("Sending msg")
        if ws then
          ws.send(textutils.serializeJSON(wsify(msg)))
        else
          error("WS closed")
        end
      else
        print("Received bad data from shop")
      end
    end
  end)

  if not s then printError(e) end
  sleep(2)
end