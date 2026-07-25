import prisma from '../../config/database';
import logger from '../../config/logger';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../shared/errors';
import { buildPagination } from '../../shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerCreateData {
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  paymentTerms?: string;
  contractRef?: string;
  avatar?: string;
  notes?: string;
}

export interface CustomerUpdateData {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  paymentTerms?: string;
  contractRef?: string;
  avatar?: string;
  notes?: string;
}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const CustomerService = {
  /**
   * Return a paginated list of customers with optional search.
   */
  async findAll(query: CustomerListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      isActive: query.isActive !== undefined ? query.isActive : true,
    };

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { company: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers,
      pagination: buildPagination(page, limit, total),
    };
  },

  /**
   * Find a single customer by id or throw NotFoundError.
   */
  async findById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true, emails: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return customer;
  },

  /**
   * Create a new customer record.
   */
  async create(data: CustomerCreateData) {
    const customer = await prisma.customer.create({
      data: {
        name: data.name.trim(),
        company: data.company.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone?.trim(),
        address: data.address?.trim(),
        city: data.city?.trim(),
        state: data.state?.trim(),
        pincode: data.pincode?.trim(),
        paymentTerms: data.paymentTerms?.trim(),
        contractRef: data.contractRef?.trim(),
        avatar: data.avatar?.trim(),
        notes: data.notes?.trim(),
      },
    });

    logger.info(`Customer created: ${customer.name} (${customer.email})`);
    return customer;
  },

  /**
   * Update an existing customer by id.
   */
  async update(id: string, data: CustomerUpdateData) {
    const existing = await prisma.customer.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Customer');
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.company !== undefined && { company: data.company.trim() }),
        ...(data.email !== undefined && { email: data.email.toLowerCase().trim() }),
        ...(data.phone !== undefined && { phone: data.phone.trim() }),
        ...(data.address !== undefined && { address: data.address.trim() }),
        ...(data.city !== undefined && { city: data.city.trim() }),
        ...(data.state !== undefined && { state: data.state.trim() }),
        ...(data.pincode !== undefined && { pincode: data.pincode.trim() }),
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms.trim() }),
        ...(data.contractRef !== undefined && { contractRef: data.contractRef.trim() }),
        ...(data.avatar !== undefined && { avatar: data.avatar.trim() }),
        ...(data.notes !== undefined && { notes: data.notes.trim() }),
      },
    });

    logger.info(`Customer updated: ${updated.name} (id: ${id})`);
    return updated;
  },

  /**
   * Soft-delete a customer by setting isActive = false.
   */
  async delete(id: string): Promise<void> {
    const existing = await prisma.customer.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Customer');
    }

    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Customer soft-deleted: ${existing.name} (id: ${id})`);
  },

  /**
   * Find a customer by exact email. Returns null if not found.
   * Used by the AI extraction service to link emails to customers.
   */
  async findByEmail(email: string) {
    return prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  },

  /**
   * Return paginated order history for a customer.
   */
  async getOrderHistory(
    customerId: string,
    query: { page?: number; limit?: number } = {},
  ) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            select: {
              id: true,
              name: true,
              sku: true,
              quantity: true,
              unitPrice: true,
              total: true,
              inventoryStatus: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              totalAmount: true,
              dueDate: true,
            },
          },
          shipment: {
            select: {
              id: true,
              status: true,
              awbNumber: true,
              carrier: true,
            },
          },
        },
      }),
      prisma.order.count({ where: { customerId } }),
    ]);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        company: customer.company,
        email: customer.email,
      },
      orders,
      pagination: buildPagination(page, limit, total),
    };
  },
};
