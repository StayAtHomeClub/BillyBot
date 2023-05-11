import { Category } from "@discordx/utilities"
import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder, EmbedField, GuildMember, Message, User, UserMention } from "discord.js"
import { Client } from "discordx"
import { injectable } from "tsyringe"

import { Discord, Slash, SlashOption } from "@decorators"
import { getColor } from "@utils/functions"

@Discord()
@injectable()
@Category('General')
export default class OddsCommand {

	constructor() {}

	@Slash({
		name: 'odds'
	})
	async oddsHandler(
		@SlashOption({ name: 'odds', type: ApplicationCommandOptionType.Number, required: true }) odds: number,
    @SlashOption({ name: 'user', type: ApplicationCommandOptionType.Mentionable, required: true }) mention: GuildMember,
		interaction: CommandInteraction,
		client: Client,
	) {

    const ROLL_ONE = this.getRoll(odds);
    const ROLL_TWO = this.getRoll(odds);

    const WIN: boolean = ROLL_ONE === ROLL_TWO;

    const embed = new EmbedBuilder()
			.setAuthor({
				name: interaction.user.username,
				iconURL: interaction.user.displayAvatarURL(),
			})
			.setTitle(`Odds out of ${odds}`)
			.setThumbnail(mention.user.displayAvatarURL())
			.setColor(getColor('primary'))
      .addFields(
        {
          name:  `\`${interaction.user.username}\``,
          value: `Rolls a ${ROLL_ONE}`,
          inline: true,
        },
        {
          name: `\`${mention.user.username}\``,
          value: `Rolls a ${ROLL_TWO}`,
          inline: true,
        }
      )
      .setFooter({
        text: `${WIN ? mention.user.username + ' is a BIG LOSER' : 'Its a scratch!'}`,
      })

      await interaction.followUp({
        embeds: [embed],
      })
	}

  private getRoll = (odds: number) => Math.floor(Math.random() * (odds) + 1);
}