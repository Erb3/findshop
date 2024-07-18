settings.define("findshop.token", {
    type = "string",
    description = "The secret token to communicate with the server with"
})

settings.define("findshop.server", {
    type = "string",
    description = "The findshop backend server"
})

settings.define("findshop.channel", {
    type = "number",
    default = 9773,
    description = "Findshop backend server port"
})

local WSSERVER = settings.get("findshop.server")
local TOKEN = settings.get("findshop.token")
local FINDSHOP_CHANNEL = settings.get("findshop.channel")

assert(WSSERVER, "WS server URL must be specified with `findshop.server`")
assert(TOKEN, "WS server token must be specified with `findshop.token`")

---@type Modem
local modems = { peripheral.find("modem") }
local modem
assert(#modems ~= 0, "No modems to listen with found")

for _, p in ipairs(modems) do
    if p.isWireless() then
        modem = p
    end
end

assert(modem, "No wireless modem found!")
modem.open(FINDSHOP_CHANNEL)
print("Opened findshop channel on modem " .. peripheral.getName(modem))

local function wait_for_packet()
    while true do
        local event, side, channel, replyChannel, msg, distance = os.pullEvent("modem_message")

        if channel == FINDSHOP_CHANNEL and side == peripheral.getName(modem) then
            if type(msg) == "table" and type(msg.info) == "table" then
                msg.info.computerID = msg.info.computerID or replyChannel
            end

            local s, res = pcall(textutils.serializeJSON, msg)
            return s, res
        end
    end
end

while true do
    local s, e = pcall(function()
        print("Attempting to connect to WebSocket")
        local ws, err = http.websocket({
            url = WSSERVER,
            headers = { ["Authorization"] = TOKEN },
            timeout = 5
        })

        assert(ws, "Failed to connect to WebSocket due to " .. err)
        print("Successfully connected to WebSocket")

        while true do
            local ok, msg = wait_for_packet()

            if ok then
                print("Sending websocket message")

                if ws then
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
    print("Attempting to connect again in 5 seconds")
    sleep(5)
end
