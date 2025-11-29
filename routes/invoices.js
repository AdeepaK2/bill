const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('customer', 'name email company')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('items.product');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    // Generate invoice number
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;
    
    const invoice = new Invoice({
      ...req.body,
      invoiceNumber
    });
    
    const newInvoice = await invoice.save();
    await newInvoice.populate('customer');
    await newInvoice.populate('items.product');
    
    res.status(201).json(newInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    Object.assign(invoice, req.body);
    const updatedInvoice = await invoice.save();
    await updatedInvoice.populate('customer');
    await updatedInvoice.populate('items.product');
    
    res.json(updatedInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark invoice as paid
router.patch('/:id/mark-paid', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    invoice.status = 'paid';
    invoice.paidDate = new Date();
    const updatedInvoice = await invoice.save();
    
    res.json(updatedInvoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Generate PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice details
    doc.fontSize(10);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 100);
    doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 50, 115);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, 130);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 50, 145);
    
    // Customer details
    doc.text('Bill To:', 50, 180);
    doc.text(invoice.customer.name, 50, 195);
    if (invoice.customer.company) {
      doc.text(invoice.customer.company, 50, 210);
    }
    doc.text(invoice.customer.email, 50, 225);
    doc.text(invoice.customer.phone, 50, 240);
    
    // Items table
    const tableTop = 290;
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 250, tableTop);
    doc.text('Price', 320, tableTop);
    doc.text('Tax', 390, tableTop);
    doc.text('Amount', 460, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let yPosition = tableTop + 25;
    invoice.items.forEach(item => {
      doc.text(item.description, 50, yPosition, { width: 190 });
      doc.text(item.quantity.toString(), 250, yPosition);
      doc.text(`$${item.unitPrice.toFixed(2)}`, 320, yPosition);
      doc.text(`${item.taxRate}%`, 390, yPosition);
      doc.text(`$${item.amount.toFixed(2)}`, 460, yPosition);
      yPosition += 25;
    });
    
    // Totals
    yPosition += 20;
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 15;
    
    doc.text('Subtotal:', 390, yPosition);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 460, yPosition);
    yPosition += 20;
    
    doc.text('Tax:', 390, yPosition);
    doc.text(`$${invoice.taxAmount.toFixed(2)}`, 460, yPosition);
    yPosition += 20;
    
    if (invoice.discount > 0) {
      doc.text('Discount:', 390, yPosition);
      doc.text(`-$${invoice.discount.toFixed(2)}`, 460, yPosition);
      yPosition += 20;
    }
    
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', 390, yPosition);
    doc.text(`$${invoice.total.toFixed(2)}`, 460, yPosition);
    
    // Notes
    if (invoice.notes) {
      doc.fontSize(10).font('Helvetica');
      doc.text('Notes:', 50, yPosition + 40);
      doc.text(invoice.notes, 50, yPosition + 55, { width: 500 });
    }
    
    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    await invoice.deleteOne();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
