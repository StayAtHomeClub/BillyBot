import { 
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder, 
	ButtonInteraction, 
	ButtonStyle, 
	Colors, 
	CommandInteraction, 
	EmbedBuilder, 
	Role, 
	StringSelectMenuBuilder
} from "discord.js"
import { Discord, Slash } from "@decorators"
import { generateDiceAttachment, getColor, rollDice } from "@utils/functions"
import { Category } from "@discordx/utilities"
import { injectable } from "tsyringe"

export enum CustomIds {
	JOIN_GAME_BUTTON = "join-game-button",
	START_GAME_BUTTON = "start-game-button",
	CANCEL_GAME_BUTTON = "cancel-game-button",
	SHOW_DICE_BUTTON = "show-dice-button",
	WAGER_BUTTON = "wager-button",
	BULLSHIT_BUTTON = "bullshit-button",
	QUANTITY_SELECT = "quantity-select",
	DICE_SELECT = "dice-select",
	SUBMIT_WAGER = "submit-wager"
}

interface Wager {
	calledBs: boolean;
	quantity: string | null;
	diceFace: string | null;
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

interface DiscordButton {
	id: string;
	label: string;
	style: ButtonStyle;
	disabled: boolean;
}

@Discord()
@injectable()
@Category('General')
export default class OddsCommand {

	game: Game;

	users: Player[];

	embed: EmbedBuilder;

	currentTurn: number;

	role: Role | undefined;

	messageId: string;

	constructor() {
		this.users = [];
		this.currentTurn = 1;
		this.game = {
			currentWager: {
				calledBs: false,
				quantity: null,
				diceFace: null,
				result: null,
			},
			currentOrder: 1
		}
	}

	@Slash({
		name: 'liars-dice'
	})
	async liarsDiceHandler(
		interaction: CommandInteraction,
	) {
		/**
		 * create attachment
		 */
    const thumbnail = new AttachmentBuilder('./assets/images/liars_dice.png', { name: 'liars_dice.png' });

		// this.role = await interaction.guild?.roles.create({
		// 	name: `liars-dice-${interaction?.user?.id}`,
		// 	color: Colors.DarkButNotBlack,
		// 	reason: `Temporary role for ${interaction?.user?.username}'s game of liars dice.`,
		// 	permissions: []
		// })

		/**
		 * Add game host as first player
		 */
		this.setGameHost(interaction);

		/**
		 * Define game buttons
		 */
		const buttonRow = this.getEmbedButtons([
			{ 
				id: 'join-game-button', 
				label: 'Join game', 
				style: ButtonStyle.Primary,
				disabled: false
			}, 
			{
				id: 'start-game-button', 
				label: 'Start game', 
				style: ButtonStyle.Success,
				disabled: false
			}, 
			{
				id: 'cancel-game-button', 
				label: 'Cancel game', 
				style: ButtonStyle.Secondary,
				disabled: false
			}
		]);

		/**
		 * Set game embed
		 */
    this.setDefaultGameEmbed(interaction);

		/**
		 * Send game embed
		 */
		const response = await interaction.reply({
			embeds: [this.embed],
			components: [buttonRow],
			files: [thumbnail],
		});

		/**
		 * Define collector
		 */
		const collector = response?.createMessageComponentCollector();

		// const collectorFilter = i => {
		// 	i.deferUpdate();
		// 	return
		// }

		collector?.on('collect', async message => {
			await message.deferUpdate();

			const messageId = message?.customId;
			const userId = message?.user?.id;
			const user: Player | undefined = this.users.find( u => u.id === userId);
			const didSelect = message.isStringSelectMenu();
			const didPushButton = message.isButton();

			switch(messageId) {
				case CustomIds.JOIN_GAME_BUTTON:
					await this.handleJoinGame(userId, interaction, message);
					break;
				case CustomIds.CANCEL_GAME_BUTTON:
					if(user) {
						await interaction.deleteReply();
						await interaction.channel?.send(`Liars dice has been cancelled by <@${message.user.id}>`);
					}
					break;
				case CustomIds.START_GAME_BUTTON:
					if(user) {
						this.users.sort( (a, b) => a.order - b.order);
						await this.handleStartGame(interaction, user);
					}
					break;
				case CustomIds.SHOW_DICE_BUTTON:
					if(user) {
						this.handleShowDice(message, user);
					}
					break;
				case CustomIds.WAGER_BUTTON:
					if(user) {
						this.handleWagerSelect(message);
					}
					break;
				case CustomIds.BULLSHIT_BUTTON:
					if(didPushButton && user) {
						this.game.currentWager.calledBs = true;
						this.handleUserWager(message, user);
					}
					break;
				case CustomIds.DICE_SELECT:
					if(didSelect && user) {
						this.game.currentWager.diceFace = message.values[0];
					}
					break;
				case CustomIds.QUANTITY_SELECT:
					if(didSelect && user) {
						this.game.currentWager.quantity = message.values[0];
					}
					break;
				case CustomIds.SUBMIT_WAGER:
					if(didPushButton && user) {
						this.handleUserWager(message, user);
					}
				default:
					break;
			}


		});

		collector?.on('end', collected => {
			console.log('ENDED: ', collected);
			this.role!.delete('Game ended');
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

	private async handleStartGame(interaction: CommandInteraction, user: Player) {

		/**
		 * Add game role to all players
		 */
		// const userList = interaction.guild?.members.cache.filter( (member) => this.users.some( async user => {
		// 	if (user.id === member.user.id) {
		// 		await member.roles.add(this.role!);
		// 		return member;
		// 	}
		// } ) );

		this.embed
			.setTitle(`${this.users[0].username} it's your turn first!`)
			.setFooter({
				text: `Active turn: ${this.users[0].username}${this.users[1]?.username ? '\nNext turn: ' + this.users[1].username : ''}\nTotal dice count: ${this.getCurrentDiceCount()}`,
			})

		const fields = this.buildGameFields();

		this.embed.setFields(...fields);

		const buttonRow = this.getEmbedButtons([
			{
				id: 'show-dice-button',
				label: 'Show Dice',
				style: ButtonStyle.Primary,
				disabled: false
			},
			{
				id: 'wager-button',
				label: 'Wager',
				style: ButtonStyle.Success,
				disabled: false
			},
			{
				id: 'liar-button',
				label: 'Liar',
				style: ButtonStyle.Danger,
				disabled: true
			},
		]);
		
		await interaction.editReply({
			embeds: [this.embed],
			components: [buttonRow]
		});
	}

	private async handleShowDice(message: any, user: Player | undefined) {
		if(user) {
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

	private async sendWagerMenu(message: CommandInteraction) {
		const diceCount = this.getCurrentDiceCount();
		const [row_one, row_two] = this.getWagerDropDowns(diceCount);
		const submitButton = this.getEmbedButtons([
			{
				id: 'submit-wager',
				label: 'Submit wager',
				style: ButtonStyle.Success,
				disabled: false
			}
		])

		const { id } = await message.followUp({
			content: 'Pick your quantity and dice to wager',
			components: [row_one, row_two, submitButton],
			ephemeral: true
		})

		this.messageId = id;
	}

	private async handleUserWager(message: ButtonInteraction, user: Player | undefined) {
		console.log('did submit: ', this.game.currentWager.quantity, this.game.currentWager.diceFace)
		message.deleteReply(this.messageId);
		
		if (this.game.currentWager.calledBs) {
			this.embed.setTitle(`${user?.username} calls a ${this.users[this.game.currentOrder -1].username} liar!`)
		} else {
			this.embed.setTitle(`${user?.username} wagers ${this.game.currentWager.quantity} ${this.game.currentWager.diceFace}${Number(this.game.currentWager.quantity) > 1 ? "'s": ""}`)
		}
	}

	private async handleWagerSelect(message: any) {
		const player = this.users.find( user => user.id === message.user.id);

		if (player && (this.currentTurn === player?.order)) {
			this.sendWagerMenu(message);
		}
		else {
			message.followUp({
				content: "It's not your turn bro.",
				ephemeral: true
			});
		}
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
				name: user.username,
				value: `Recent wager: ${this.getUsersLastWager(user)}\nTurn order: ${user.order}\nDice count: ${user.dice.length}`,
				inline: i === 0 ? false : true
			})
		}
		return fields;
	}

	private getSelectFields = (count: number) => {
		const fields = [];
		for (var i = 0; i < count; i++) {
			fields.push({
				label: `${i + 1}`,
				value: `${i + 1}`,
			})
		}
		return fields;
	}

	private setDefaultGameEmbed = (interaction: CommandInteraction) => {
		this.embed = new EmbedBuilder()
			.setAuthor({
				name: `Host: ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL(),
			})
			.setTitle(`${interaction.user.username} started a game of Liar's Dice!                \n\nPlayer list: `)
			.setThumbnail('attachment://liars_dice.png')
			.setColor(getColor('primary'))
			.setFields({
				name: `Player 1`,
				value: `${interaction.user.username}`,
				inline: true
			})
			.setFooter({
				text: `Player count: ${this.users.length}`
			})

	}

	private getEmbedButtons = (buttons: DiscordButton[]) => {
		const embedButtons = buttons.map( button => (
			new ButtonBuilder()
				.setLabel(button.label)
				.setStyle(button.style)
				.setCustomId(button.id)
				.setDisabled(button.disabled)
		));

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(embedButtons);

		return row;
	}

	private setGameHost = (interaction: CommandInteraction) => {
		this.users.push({
			id: interaction.user.id,
			username: interaction.user.username,
			order: this.findNextOrder(),
			dice: rollDice('5d6')[0],
			wagers: []
		});
	}

	private getWagerDropDowns = (diceCount: number) => {
		const quantityDropdown = new StringSelectMenuBuilder()
			.setCustomId('quantity-select')
			.setPlaceholder('Select quantity')
			.setMaxValues(diceCount)
			.setMinValues(1)
			.addOptions(...this.getSelectFields(diceCount))
	
		const diceFaceDropdown = new StringSelectMenuBuilder()
			.setCustomId('dice-select')
			.setPlaceholder('Select dice number')
			.setMaxValues(6)
			.setMinValues(1)
			.addOptions(...this.getSelectFields(6))
	
		const row_one = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(quantityDropdown);

		const row_two = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(diceFaceDropdown);

		return [
			row_one,
			row_two
		];
	}

	private getCurrentDiceCount = () => {
		return this.users.map( u => u.dice.length).reduce( (partialSum, a) => partialSum + a, 0 );
	}

	private getUsersLastWager = (user: Player) => {
		if(user.wagers.length) {
			const wager = user.wagers.pop();
			if(wager?.calledBs) {
				return 'Called Liar!'
			} else {
				return `Bet ${wager?.quantity} ${wager?.diceFace}${wager?.quantity && (Number(wager.quantity) > 1) ? "'s": ""}`
			}
		} else {
			return '';
		}
	}

}