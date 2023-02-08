const config = require('./config.json')
const fs = require('node:fs')
const path = require('node:path')

const { Client, Events, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js')
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`)

	const embed = new EmbedBuilder()
	.setColor(0x37474f)
	.setTitle('Suporte ao usuário')
	.setDescription(`Abra um ticket caso esteja precisando de ajuda.\r\nIndique seu nome de usuário no servdor e descreva o seu problema.\r\nNossa equipe entrará em contato o mais rapido possivel!`)

	const button = new ActionRowBuilder()
	.addComponents(
		new ButtonBuilder()
		.setCustomId('openTicket')
		.setLabel('Abrir Ticket')
		.setStyle(ButtonStyle.Secondary)
	)	

	const message = {
		embeds: [embed],
		components: [button]
	}

	const supportChannel = client.channels.cache.get(config.channels.support)
	supportChannel.bulkDelete(10, true)
	.then(_ => supportChannel.send(message))
	.catch(error => console.error(error))
})

const buttons = {
	openTicket: async interaction => {
		const modal = new ModalBuilder()
		.setCustomId('openTicketModal')
		.setTitle('Suporte ao usuário')

		const username = new TextInputBuilder()
		.setRequired(true)
		.setCustomId('username')
		.setLabel('Nome de usuário')
		.setStyle(TextInputStyle.Short)

		const description = new TextInputBuilder()
		.setRequired(true)
		.setCustomId('description')
		.setLabel('Ticket')
		.setPlaceholder('Digite aqui o conteudo para o ticket.')
		.setStyle(TextInputStyle.Paragraph)

		const components = [
			new ActionRowBuilder().addComponents(username),
			new ActionRowBuilder().addComponents(description)
		]

		modal.addComponents(...components)
		await interaction.showModal(modal)
	},

	createChannel: async interaction => {
		const { value: user } = interaction.message.mentions.users.values().next()
		const channels = interaction.member.guild.channels
		const channel = await channels.create({
			name: user.id,
			type: ChannelType.GuildText,
			parent: config.channels.category
		})


		const embed = new EmbedBuilder()
		.setColor(0x37474f)
		.setTitle(`Suporte ao usuário`)
		.setDescription(`Olá <@!${user.id}>, este canal foi criado com o intuito de solucionar o seu problema.\r\nToda a conversa será registrada, então por favor, não envie senhas ou quaisquer informações sensíveis.\r\n\nSinta-se a vontade para fechar o ticket a qualquer momento.`)

		const closeButton = new ActionRowBuilder()
		.addComponents(		
			new ButtonBuilder()
			.setCustomId('concluirTicket')
			.setLabel('Fechar')
			.setStyle(ButtonStyle.Danger)
		)

		await channel.send({ content: `||<@!${user.id}>||`, embeds: [embed], components: [closeButton] }).then(message => message.pin())
		await channel.permissionOverwrites.edit(user.id, {
			ViewChannel: true,
			SendMessages: true,
			EmbedLinks: true,
			AttachFiles: true,
			ReadMessageHistory: true
		})
		await channel.send({ content: `Olá <@!${user.id}>, em que podemos ajudá-lo ?` })

        const button = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
			.setURL(`https://discord.com/channels/${channel.guildId}/${channel.id}`)
			.setLabel('Responder')
			.setStyle(ButtonStyle.Link)
		)

		await interaction.message.edit({ components: [button] })
		await interaction.reply({ content: `Foi criado um canal com o usuário <@!${user.id}>.`, ephemeral: true })
	},

	concluirTicket: async interaction => {
		const { value: user } = interaction.message.mentions.users.values().next()
		await interaction.channel.permissionOverwrites.delete(user.id, '...')
		await interaction.message.edit({ components: [] })
		await interaction.reply('Este ticket foi encerrado.')
	},

	fecharTicket: async interaction => {
		await interaction.message.edit({ components: [] })
	}
}

const modals = {
	async openTicketModal(interaction) {
		await interaction.reply({ content: 'Seu ticket foi enviado para a nossa equipe de suporte.', ephemeral: true })

		const username = interaction.fields.getTextInputValue('username')
		const description = interaction.fields.getTextInputValue('description')

		const embed = new EmbedBuilder()
		.setColor(0x37474f)
		.setTitle(`Ticket de ${username}`)
		.setDescription(description)

		const button = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
			.setCustomId('createChannel')
			.setLabel('Criar Canal')
			.setStyle(ButtonStyle.Primary),			
			new ButtonBuilder()
			.setCustomId('fecharTicket')
			.setLabel('Fechar')
			.setStyle(ButtonStyle.Danger)
		)

		const message = {
			content: `Enviado por: <@!${interaction.user.id}>`,
			embeds: [embed],
			components: [button]
		}

		const supportChannel = client.channels.cache.get(config.channels.logs)
		supportChannel.send(message)
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isButton()) {
		const button = buttons[interaction.customId]
		if (button) return button(interaction)
	}

	if (interaction.isModalSubmit()) {
		const modal = modals[interaction.customId]
		if (modal) return modal(interaction)
	}
})

client.login(config.token)