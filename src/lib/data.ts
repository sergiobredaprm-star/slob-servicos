import { Budget, DailyRateSettings } from "@/lib/types";

export const budgets: Budget[] = [
    {
        id: "ORC-001",
        clientName: "Tech Solutions",
        task: "Desenvolvimento de Landing Page",
        total: 1500,
        status: "concluído",
        email: "contato@techsolutions.com"
    },
    {
        id: "ORC-002",
        clientName: "Inova Corp",
        task: "Manutenção em sistema legado",
        total: 3200,
        status: "ativo",
        email: "financeiro@inovacorp.com"
    },
    {
        id: "ORC-003",
        clientName: "Marketing Digital Fácil",
        task: "Criação de campanha de email",
        total: 800,
        status: "ativo",
        email: "ceo@mktfacil.com"
    },
    {
        id: "ORC-004",
        clientName: "Café Saboroso",
        task: "Design de novo cardápio",
        total: 450,
        status: "cancelado",
        email: "gerencia@cafesaboroso.net"
    },
    {
        id: "ORC-005",
        clientName: "Advocacia Justa",
        task: "Consultoria de TI",
        total: 2500,
        status: "concluído",
        email: "admin@justa.adv.br"
    },
    {
        id: "ORC-006",
        clientName: "Pet Shop Amigo Fiel",
        task: "Sistema de agendamento online",
        total: 4500,
        status: "ativo",
        email: "dono@amigofielpet.com"
    },
];

export const settings: DailyRateSettings = {
    startTime: "08:00",
    endTime: "17:00",
    workload: 8,
    defaultRate: 150,
}

export const financialSummary = {
    totalOrcado: budgets.reduce((sum, budget) => sum + budget.total, 0),
    totalRecebido: budgets.filter(b => b.status === 'concluído').reduce((sum, budget) => sum + budget.total, 0),
    totalPendente: budgets.filter(b => b.status === 'ativo').reduce((sum, budget) => sum + budget.total, 0),
    totalCancelado: budgets.filter(b => b.status === 'cancelado').reduce((sum, budget) => sum + budget.total, 0),
}
