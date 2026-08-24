import express from 'express';
import * as InvoiceHelper from './invoice.service.js';

const Router = express.Router();

const createInvoice = async (req, res, next) => {
    try {
        const data = await InvoiceHelper.createInvoice(req.body);
        res.status(200).json({ status: 200, message: "Successfully added.", data });
    } catch (error) {
        next(error);
    }
};

const editInvoice = async (req, res, next) => {
    try {
        const data = await InvoiceHelper.editInvoice(req.params.id);
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const updateInvoice = async (req, res, next) => {
    try {
        const data = await InvoiceHelper.updateInvoice(req.params.id, req.body);
        res.status(200).json({ status: 200, message: "Successfully updated.", data });
    } catch (error) {
        next(error);
    }
};

const listInvoice = async (req, res, next) => {
    try {
        const { status, payment_status, org_id, order_id } = req.query;
        const data = await InvoiceHelper.listInvoice({ status, payment_status, org_id, order_id });
        res.status(200).json({ status: 200, message: "Successfully fetched.", data });
    } catch (error) {
        next(error);
    }
};

const listInvoicePagination = async (req, res, next) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { status, payment_status, org_id, order_id } = req.query;

        const [invoices, total] = await Promise.all([
            InvoiceHelper.listInvoicePagination(page, limit, { status, payment_status, org_id, order_id }),
            InvoiceHelper.getInvoiceCount({ status, payment_status, org_id, order_id }),
        ]);
        res.status(200).json({
            status: 200,
            message: "Successfully fetched.",
            data: invoices,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        });
    } catch (error) {
        next(error);
    }
};

const deleteInvoice = async (req, res, next) => {
    try {
        const data = await InvoiceHelper.deleteInvoice(req.params.id);
        res.status(200).json({ status: 200, message: "Successfully deleted.", data });
    } catch (error) {
        next(error);
    }
};

Router.post('/create',          createInvoice);
Router.get('/list',             listInvoice);
Router.get('/list-pagination',  listInvoicePagination);
Router.get('/edit/:id',         editInvoice);
Router.put('/update/:id',       updateInvoice);
Router.get('/delete/:id',       deleteInvoice);
Router.get('/:id',              editInvoice);

export default Router;
