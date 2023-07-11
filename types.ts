/**
 * FindShop Chatbox Server - Types
 * Copyright (C) 2023  slimit75
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Location of a shop. All fields are optional.
export interface Location {
    coordinates?: number[],
    description?: string,
    dimension?: string
}

// Structure of the shop item object.
export interface Item {
    prices: {
        value: number,
        currency: string,
        address: string,
        requiredMeta?: string
    }[],
    item: {
        name: string,
        displayName: string,
        nbt?: string
    }
    dynamicPrice?: boolean,
    stock?: number,
    madeOnDemand?: boolean,
    requiresInteraction?: boolean,
    shopBuysItem?: boolean,
    noLimit?: boolean
}

// Structure of the shop object.
export interface Shop {
    type: string,
    info: {
        name: string,
        description?: string,
        owner?: string,
        computerID?: number,
        multiShop?: number,
        software?: {
            name?: string,
            version?: string
        },
        location: Location,
        otherLocations?: Location[],

    }
    items: Item[]
}