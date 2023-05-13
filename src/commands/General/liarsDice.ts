import { Category } from "@discordx/utilities"
import { ActionRowBuilder, ApplicationCommandOptionType, Attachment, AttachmentBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, EmbedBuilder, EmbedField, EmbedType, GuildMember, Message, MessageCollector, SelectMenuBuilder, StringSelectMenuBuilder, User, UserMention } from "discord.js"
import { Client, SelectMenuComponent } from "discordx"
import { injectable } from "tsyringe"

import { Discord, Slash } from "@decorators"
import { generateDiceAttachment, getColor, rollDice } from "@utils/functions"

export enum CustomIds {
	JOIN_GAME_BUTTON = "join-game-button",
	START_GAME_BUTTON = "start-game-button",
	CANCEL_GAME_BUTTON = "cancel-game-button",
	SHOW_DICE_BUTTON = "show-dice-button",
	WAGER_BUTTON = "wager-button",
	BULLSHIT_BUTTON = "bullshit-button"
}

interface Wager {
	message: string | null;
	calledBs: boolean;
	result: string | null;
}

interface Player {
	id: string;
	username: string;
	order: number;
	dice: any;
	wagers: Wager[];
}

interface Game {
	currentWager: Wager;
	currentOrder: number;
}

@Discord()
@injectable()
@Category('General')
export default class OddsCommand {

	game: Game;

	users: Player[];

	embed: EmbedBuilder;

	constructor() {
		this.users = [];
		this.game = {
			currentWager: {
				message: null,
				calledBs: false,
				result: null,
			},
			currentOrder: 1
		}
	}

	@Slash({
		name: 'liars-dice'
	})
	async oddsHandler(
		interaction: CommandInteraction,
		message: Message,
		client: Client,
	) {
    const thumbnail = new AttachmentBuilder('./assets/images/liars_dice.png', { name: 'liars_dice.png' });

		/**
		 * Add game initializer as first player
		 */
		this.users.push({
			id: interaction.user.id,
			username: interaction.user.username,
			order: this.findNextOrder(),
			dice: rollDice('5d6')[0],
			wagers: []
		});

		/**
		 * Define game buttons
		 */
		const join = new ButtonBuilder()
			.setLabel('Join game')
			.setStyle(ButtonStyle.Primary)
			.setCustomId('join-game-button');

		const start = new ButtonBuilder()
			.setLabel('Start game')
			.setStyle(ButtonStyle.Success)
			.setCustomId('start-game-button');
		
		const cancel = new ButtonBuilder()
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Secondary)
			.setCustomId('cancel-game-button');

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(join, start, cancel);

		/**
		 * Set game embed
		 */
    this.embed = new EmbedBuilder()
			.setAuthor({
				name: interaction.user.username,
				iconURL: interaction.user.displayAvatarURL(),
			})
			.setTitle(`Started a game of Liar's Dice!`)
			.setThumbnail('attachment://liars_dice.png')
			.setColor(getColor('primary'))
			.setFields({
				name: `Player 1`,
				value: `${interaction.user.username}`,
				inline: true
			})
			.setFooter("\u3000".repeat(10) +"|" )

		const response = await interaction.reply({
			embeds: [this.embed],
			components: [row],
			files: [thumbnail],
		});

		const collector = response?.createMessageComponentCollector({ time: 120000 });

		// const collectorFilter = i => {
		// 	i.deferUpdate();
		// 	return
		// }

		collector?.on('collect', async message => {
			await message.deferUpdate();

			if (message.customId === CustomIds.JOIN_GAME_BUTTON) {
				const userId = message?.user?.id;
				await this.handleJoinGame(userId, interaction, message);
			}

			if (message.customId === CustomIds.CANCEL_GAME_BUTTON) {
				await interaction.deleteReply();
				await interaction.channel?.send(`Liars dice has been cancelled by <@${message.user.id}>`);
			}

			if (message.customId === CustomIds.START_GAME_BUTTON) {
				this.users.sort( (a, b) => a.order - b.order);
				await this.handleStartGame(interaction);
			}

			if (message.customId === CustomIds.SHOW_DICE_BUTTON) {
				this.handleShowDice(message);
			}

			if (message.customId === CustomIds.WAGER_BUTTON) {
				const playerCount = this.users.length;
				const diceCount = this.users.map( u => u.dice.length).reduce( (partialSum, a) => partialSum + a, 0 );

				const quantityDropdown = new StringSelectMenuBuilder()
					.setCustomId(`${message.user.id}-wager`)
					.setPlaceholder('Select quantity')
					.addOptions(...this.getSelectFields(diceCount))

				const diceFaceDropdown = new StringSelectMenuBuilder()
					.setCustomId(`${message.user.id}-dice`)
					.setPlaceholder('Select dice face')
					.addOptions(...this.getSelectFields(6))

				const row = new ActionRowBuilder<StringSelectMenuBuilder>()
					.addComponents(quantityDropdown, diceFaceDropdown);

				message.update({
					content: 'Pick your quantity and dice face to wager',
					components: [row],
				})
			}

			if (message.customId === CustomIds.BULLSHIT_BUTTON) {
				console.log('bullshit');
			}


		});

		collector?.on('end', collected => {
			console.log('ENDED: ', collected);
		})
	}

	private async handleJoinGame(userId: string, interaction: CommandInteraction, message: any) {
		const userExists = this.users.findIndex( user => user.id === userId);
		if (userExists === -1) {
			this.users.push({
				id: message.user.id,
				username: message.user.username,
				order: this.findNextOrder(),
				dice: rollDice('5d6')[0],
				wagers: []
			});
		} 
		else {
			this.users.splice(userExists, 1);
		}

		await this.displayUsers(interaction);
	}

	private async handleStartGame(interaction: CommandInteraction) {

		const fields = this.buildGameFields();
		this.embed.setFields(...fields);

		const showDice = new ButtonBuilder()
			.setLabel('Show Dice')
			.setStyle(ButtonStyle.Primary)
			.setCustomId('show-dice-button');
		
		const wager = new ButtonBuilder()
			.setLabel('Wager')
			.setStyle(ButtonStyle.Success)
			.setCustomId('wager-button');
		
		const bullshit = new ButtonBuilder()
			.setLabel('Bullshit')
			.setStyle(ButtonStyle.Danger)
			.setCustomId('bullshit-button');

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(showDice, wager, bullshit);

		await interaction.editReply({
			embeds: [this.embed],
			components: [row]
		});
	}

	private async handleShowDice(message: any) {
		const user: Player | undefined = this.users.find( u => u.id === message.user.id);
		const { attachment } = await generateDiceAttachment([user?.dice]);

		const embed = new EmbedBuilder()
			.setColor(getColor('primary'))
			.setTitle(`${message.user.username} rolls...`)
			.setImage("attachment://currentDice.png")

		await message.followUp({
			embeds: [embed],
			files: [attachment],
			ephemeral: true
		});
	}

	private async displayUsers(interaction: CommandInteraction) {
		this.embed.setFields(
			...(this.users.map( ({ username }, index: number) => {
				return (
					{
						name: `Player ${index + 1}`,
						value: `${username}`,
						inline: true
					}
				)
			}))
		);
		this.embed.setFooter({
			text: `${this.users.length} players in the game`
		})

		await interaction.editReply({
			embeds: [this.embed],
		});
	}

	private findNextOrder = () => {
		const sorted = this.users.slice().sort((a: any, b: any) => a.order - b.order);
		let previousOrder = 0;
		for (let el of sorted) {
			if (el.order != (previousOrder + 1)) {
				return previousOrder + 1;
			}
			previousOrder = el.order;
		}

  	return previousOrder + 1;
	}

	private buildGameFields = () => {
		const fields = [];
		for( var i = 0; i < this.users.length; i++ ) {
			const user = this.users[i];
			fields.push({
				name: `${user.username}`,
				value: `Dice count: ${user.dice.length}`,
				inline: true
			})
		}
		return fields;
	}

	private getSelectFields = (count: number) => {
		const fields = [];
		for (var i = 0; i < count; i++) {
			fields.push({
				label: `${i + 1}`,
				description: `${i + 1}`,
				value: `${i + 1}`,
			})
		}
		return fields;
	}

}