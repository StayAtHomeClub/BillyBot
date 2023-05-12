export const generalConfig: GeneralConfigType = {

	name: 'BillyBot', // the name of your bot
	description: 'Discord bot for Beelos Brotherhood', // the description of your bot
	defaultLocale: 'en', // default language of the bot, must be a valid locale
	ownerId: process.env['BOT_OWNER_ID'] || '',
	timezone: 'America/Los_Angeles', // default TimeZone to well format and localize dates (logs, stats, etc)

	simpleCommandsPrefix: '!', // default prefix for simple command messages (old way to do commands on discord)
	automaticDeferring: true, // enable or not the automatic deferring of the replies of the bot on the command interactions

	// useful links
	links: {
		invite: '',
		supportServer: 'https://discord.com/api/oauth2/authorize?client_id=1105966528765112320&permissions=8&scope=bot',
		gitRemoteRepo: 'https://github.com/StayAtHomeClub/BillyBot',
	},
	
	automaticUploadImagesToImgur: false, // enable or not the automatic assets upload

	devs: [], // discord IDs of the devs that are working on the bot (you don't have to put the owner's id here)

	eval: {
		name: 'bot', // name to trigger the eval command
		onlyOwner: false // restrict the eval command to the owner only (if not, all the devs can trigger it)
	},

	// define the bot activities (phrases under its name). Types can be: PLAYING, LISTENING, WATCHING, STREAMING
    activities: [
		{
			text: 'with Billy',
			type: 'PLAYING'
		},
	]

}

// global colors
export const colorsConfig = {
	primary: '#FF5733'
}
