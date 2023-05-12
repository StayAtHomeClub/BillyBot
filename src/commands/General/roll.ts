import { Category } from "@discordx/utilities"
import { CommandInteraction, EmbedBuilder } from "discord.js"
import { injectable } from "tsyringe"

import { Discord, Slash } from "@decorators"
import { generateDiceAttachment, getColor, rollDice } from "@utils/functions"

@Discord()
@injectable()
@Category('General')
export default class RollCommand {

	constructor() {}

	@Slash({
		name: 'roll'
	})
	async rollHandler(
		interaction: CommandInteraction,
	) {

    const diceArray: any = rollDice('2d6');

    const { attachment } = await generateDiceAttachment(diceArray);

    const embed = new EmbedBuilder()
      .setColor(getColor('primary'))
      .setTitle(`${interaction.user.username} rolls...`)
      .setImage("attachment://currentDice.png")

    interaction.followUp({
      embeds: [embed],
      files: [attachment]
    })

	}

}