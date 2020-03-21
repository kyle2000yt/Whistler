const { Command } = require("../../Structures")
const { get } = require("axios")
const moment = require("moment")
const { auth } = require("../../Config")

module.exports = class TimeCommand extends Command {
    constructor(client) {
        super(client, {
            title: `time`,
            aliases: ['tz', `timezone`],
            description: "Gets the time for a location.",
            usage: `<location>`,
            category: `media`
        })
    }
    async run(msg, {
        Colors
    }, {
        userDocument
    }, suffix) {
        let address;
        if (suffix) {
            if (suffix.indexOf("<@") == 0) {
                let member = this.client.getMember(suffix, msg.guild)
                if (member) {
                    try {
                        const usrData = await member.user.populateDocument()
                        address = usrData.location
                    } catch (err) {
                        this.client.log.error(`Failed to find or create user data`, {
                            usr_id: member.user.id
                        }, err)
                        await msg.channel.send({
                            embed: {
                                color: Colors.ERROR,
                                title: `❌ Error:`,
                                description: `I couldn't get that user's location.`
                            }
                        })
                    }
                }
            } else {
                address = encodeURIComponent(suffix);
            }
        } else {
            address = userDocument.location;
        }
        if (address) {
            try {
                const { data } = await get(`https://maps.googleapis.com/maps/api/geocode/json`, {
                    params: {
                        address: address,
                        key: auth.keys.googleMapsAPI
                    },
                    headers: {
                        "Accept": "application/json"
                    }
                })
                if (data.status == "OK") {
                    const reponse = await get(`https://maps.googleapis.com/maps/api/timezone/json`, {
                        params: {
                            location: `${data.results[0].geometry.location.lat},${data.results[0].geometry.location.lng}`,
                            timestamp: Math.floor(Date.now() / 1000),
                            key: auth.keys.googleMapsAPI
                        },
                        headers: {
                            "Accept": "application/json"
                        }
                    })
                    await msg.channel.send({
                        embed: {
                            color: this.client.getEmbedColor(msg.guild),
                            title: `🕐 Time:`,
                            description: `Currently, it's **${moment(new Date(Date.now() + (parseInt(reponse.data.rawOffset) * 1000) + (parseInt(reponse.data.dstOffset) * 1000))).utc().format("h:mma")}** in **${data.results[0].address_components[0].long_name}**. The timezone is **${reponse.data.timeZoneName}**.`,
                            footer: {
                                text: `Information provided by Google Maps API.`
                            }
                        }
                    })
                } else {
                    await msg.channel.send({
                        embed: {
                            color: Colors.SOFT_ERROR,
                            title: `⚠️ Warning:`,
                            description: `I couldn't find that location.`
                        }
                    })
                }

            } catch ({ stack }) {
                this.client.log.error(`Failed to contact Google Maps API`, stack)
                await msg.channel.send({
                    embed: {
                        color: Colors.ERROR,
                        title: `❌ Error:`,
                        description: `An error occurred while getting the time.`
                    }
                })
            }

        } else {
            await msg.channel.send({
                embed: {
                    color: Colors.SOFT_ERROR,
                    title: `⚠️ Warning:`,
                    description: `I need a location to get the time for.`
                }
            })
        }
    }
}