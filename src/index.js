const express = require('express')
const { v4: uuidv4 } = require('uuid')

const app = express()
app.use(express.json())

//CRIANDO ARRAY PARA ARMAZENAR OS DADOS QUE SERÃO CRIADOS
const custumers = []

//Midddlware para verificar se existe uma conta
function verifyIfExistsAccountCPF(request, response, next) {
	const { cpf } = request.headers

	//procurar se existe um cpf igual ao passado passado via get
	const customer = custumers.find((custumer) => custumer.cpf === cpf)

	//verifar se a conta existe, caso não exista não será possivel depositar na conta
	if (!customer) {
		return response.status(404).json({ error: 'conta não existe!' })
	}

	//passando os valores de customer para ser utilizado fora da middlware
	request.customer = customer

	return next()
}

//Funcap para somar/subtratir os valores da conta
function getBalance(statement) {
	const balance = statement.reduce((acc, operation) => {
		if (operation.type === 'credit') {
			return acc + operation.amount
		} else {
			return acc - operation.amount
		}
	}, 0)
	return balance
}

//CADASTRAR CONTA
app.post('/account', (request, response) => {
	const { cpf, name } = request.body

	//Regra para verificar se já possui cpf cadastrado///
	const custumerAlreadyExists = custumers.some(
		(custumer) => custumer.cpf === cpf,
	)

	if (custumerAlreadyExists) {
		return response.status(400).json({ error: 'este CPF já existe!' })
	}
	//////////////////////////////////////////////////////

	//inserindo os dados no array customers
	custumers.push({
		cpf,
		name,
		id: uuidv4(),
		statement: [],
	})

	return response.status(201).send()
})

//BUSCAR O EXTRATO BANCARIO DO CLIENTE
app.get('/statement/', verifyIfExistsAccountCPF, (request, response) => {
	const { customer } = request

	return response.json(customer.statement)
})

//INSERIR UM DEPOSITO BANCARIO
app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
	//pegando os dados descrição e valor vindos do corpo =body=
	const { description, amount } = request.body

	const { customer } = request

	const statementOperation = {
		description,
		amount,
		created_at: new Date(),
		type: 'credit',
	}

	customer.statement.push(statementOperation)

	return response.status(201).send()
})

//REALIZANDO UM SAQUE BANCARIO
app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
	const { amount } = request.body
	const { customer } = request

	const balance = getBalance(customer.statement)

	//verificar se existe saldo suficiente na conta
	if (balance < amount) {
		return response.status(400).json({ error: 'Saldo insuficiente' })
	}

	//salvando o novo valor apos a operacao de saque nas variaveis
	const statementOperation = {
		amount,
		created_at: new Date(),
		type: 'debit',
	}

	//puxando o novo valor para o array statement
	customer.statement.push(statementOperation)

	return response.status(201).send()
})

//BUSCAR O EXTRATO BANCARIO DO CLIENTE POR DATA
app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
	const { customer } = request
	const { date } = request.query

	const dateFormat = new Date(date + ' 00:00')

	const statement = customer.statement.filter(
		(statement) =>
			statement.created_at.toDateString() ===
			new Date(dateFormat).toDateString(),
	)

	return response.json(statement)
})

//ATUALIZAR DADOS BANCARIOS DOO CLIENTE
app.put('/account', verifyIfExistsAccountCPF, (request, response) => {
	const { name } = request.body
	const { customer } = request

	customer.name = name

	return response.status(201).send()
})

//BUSCANDO DADOS DO CLIENTE E MOSTRANDO
app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
	const { customer } = request

	return response.json(customer)
})

//DELETAR CONTA
app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
	const { customer } = request

	//funcao para remover dados do arrary
	custumers.splice(customer, 1)

	return response.status(200).json(custumers)
})

//retornar dados do balanço
app.get('/balance', verifyIfExistsAccountCPF, (request, response) => {
	const { customer } = request

	const balance = getBalance(customer.statement)

	return response.json(balance)
})

app.listen(3333)
