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
-- This seems not different
-- scroll down
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

local function receive()
  while true do
    local event, side, channel, replyChannel, msg, distance = os.pullEvent("modem_message")

    if channel == PORT then
      if type(msg) == "table" and type(msg.info) == "table" then
        msg.info.computerID = msg.info.computerID or replyChannel
      end

      local s, res = pcall(textutils.serializeJSON, msg)
      return s, res
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
          print(#msg)
          ws.send(msg)
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
