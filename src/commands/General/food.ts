import { Category } from "@discordx/utilities"
import { APIEmbed, ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js"
import { Client } from "discordx"
import { injectable } from "tsyringe"

import { Discord, Slash, SlashOption } from "@decorators"
import { getColor } from "@utils/functions"

const yelp = require("yelp-fusion");
const yelpClient = yelp.client(process.env['YELP_API_KEY']);

@Discord()
@injectable()
@Category('General')
export default class OddsCommand {

	constructor() {}

	@Slash({
		name: 'food'
	})
	async oddsHandler(
		@SlashOption({ name: 'type', type: ApplicationCommandOptionType.String, required: false }) type: string,
    @SlashOption({ name: 'location', type: ApplicationCommandOptionType.String, required: false }) location: string,
    @SlashOption({ 
      name: 'suggestions_count', 
      description: "The number of results you want.", 
      type: ApplicationCommandOptionType.Number, 
      minValue: 1,
      maxValue: 5,
      required: false 
    }) suggestionCount: number = 1,
		interaction: CommandInteraction,
	) {

    const places = await this.getFood(location, type, suggestionCount);

    const embeds = this.createYelpEmbeds(places.businesses);

    await interaction.followUp({
      embeds: embeds,
    });
	}

  private getFood = async (location: string, type: string, limit: number) => {

    try {
      const places = await yelpClient.search({
        term: 'food',
        categories: type,
        location: location ? location : 'mission viejo, ca',
        limit
      });
      return JSON.parse(places?.body);
    } catch (error) {
      console.log('ERR: ', error);
    }
  }

  private createYelpEmbeds = (places: any): APIEmbed[] => {
    const sortOrder = ['Location', 'Phone Number', 'Reviews', 'Rating', 'Price'];
    const embeds = places.map( (place: any) => {
      const { name, image_url, url } = place;

      const fields = this.getFields(place).sort(
        function(a, b) {
          return sortOrder.indexOf(a.name) - sortOrder.indexOf(b.name);
        }
      );

      const embed = new EmbedBuilder()
        .setTitle(name)
        .setImage(image_url ? image_url : '')
        .setURL(url ? url : '')
        .setColor(getColor('primary'))
        .addFields( ...fields );

      return embed;

    });

    return embeds;
  }

 private getFields = (place: any) => {
    const fields = [];

    for( const key in place ) {
      switch(key) {
        case 'location': 
          if (place[key]) {
            fields.push({
              name: 'Location',
              value: `${place[key].display_address?.join('\n')}`,
              inline: false
            });
          }
          break;
        case 'display_phone':
          if (place[key]) {
            fields.push({
              name: 'Phone Number',
              value: place[key],
              inline: true
            });
          }
          break;
        case 'review_count':
          if (place[key]) {
            fields.push({
              name: 'Reviews',
              value: `${place[key]}`,
              inline: true
            });
          }
          break;
        case 'price':
          if (place[key]) {
            fields.push({
              name: 'Price',
              value: `${place[key]}`,
              inline: true
            });
          }
          break;
        case 'rating':
          if (place[key]) {
            fields.push({
              name: 'Rating',
              value: `${place[key]}`,
              inline: true
            });
          }
          break;
      }
    }

    return fields;
  }
}