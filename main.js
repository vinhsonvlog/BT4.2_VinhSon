// ==================== STATE MANAGEMENT ====================
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortOrder = { title: 'none', price: 'none' };
let currentProduct = null;
let deleteProductId = null;

// API Base URL
const API_URL = 'https://api.escuelajs.co/api/v1/products';

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setCurrentDate();
    fetchProducts();
    initializeEventListeners();
}

function setCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = 
        new Date().toLocaleDateString('vi-VN', options);
}

// ==================== API FUNCTIONS ====================
async function fetchProducts() {
    showLoading();
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        allProducts = await response.json();
        filteredProducts = [...allProducts];
        
        updateStats();
        renderTable();
        renderPagination();
        showToast('Thành công', 'Đã tải dữ liệu sản phẩm', 'success');
    } catch (error) {
        console.error('Error fetching products:', error);
        showToast('Lỗi', 'Không thể tải dữ liệu sản phẩm', 'error');
    } finally {
        hideLoading();
    }
}

async function createProduct(data) {
    showLoading();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Failed to create product');
        
        const newProduct = await response.json();
        allProducts.unshift(newProduct);
        filteredProducts = [...allProducts];
        
        updateStats();
        renderTable();
        renderPagination();
        
        closeModal('createModal');
        showToast('Thành công', 'Đã tạo sản phẩm mới', 'success');
        return true;
    } catch (error) {
        console.error('Error creating product:', error);
        showToast('Lỗi', 'Không thể tạo sản phẩm', 'error');
        return false;
    } finally {
        hideLoading();
    }
}

async function updateProduct(id, data) {
    showLoading();
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Failed to update product');
        
        const updatedProduct = await response.json();
        
        // Update in arrays
        const allIndex = allProducts.findIndex(p => p.id === id);
        const filteredIndex = filteredProducts.findIndex(p => p.id === id);
        
        if (allIndex !== -1) allProducts[allIndex] = updatedProduct;
        if (filteredIndex !== -1) filteredProducts[filteredIndex] = updatedProduct;
        
        updateStats();
        renderTable();
        
        closeModal('editModal');
        showToast('Thành công', 'Đã cập nhật sản phẩm', 'success');
        return true;
    } catch (error) {
        console.error('Error updating product:', error);
        showToast('Lỗi', 'Không thể cập nhật sản phẩm', 'error');
        return false;
    } finally {
        hideLoading();
    }
}

async function deleteProduct(id) {
    showLoading();
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete product');
        
        // Remove from arrays
        allProducts = allProducts.filter(p => p.id !== id);
        filteredProducts = filteredProducts.filter(p => p.id !== id);
        
        updateStats();
        renderTable();
        renderPagination();
        
        closeModal('deleteModal');
        closeModal('detailModal');
        showToast('Thành công', 'Đã xóa sản phẩm', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Lỗi', 'Không thể xóa sản phẩm', 'error');
        return false;
    } finally {
        hideLoading();
    }
}

// ==================== EVENT LISTENERS ====================
function initializeEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
    
    // Sort buttons
    document.getElementById('sortTitle').addEventListener('click', () => sortBy('title'));
    document.getElementById('sortPrice').addEventListener('click', () => sortBy('price'));
    
    // Items per page
    document.getElementById('itemsPerPage').addEventListener('change', handleItemsPerPageChange);
    
    // Export
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    
    // Create button
    document.getElementById('createBtn').addEventListener('click', openCreateModal);
    document.getElementById('saveCreateBtn').addEventListener('click', handleCreate);
    
    // Edit button
    document.getElementById('editFromDetailBtn').addEventListener('click', openEditModal);
    document.getElementById('saveEditBtn').addEventListener('click', handleEdit);
    
    // Delete buttons
    document.getElementById('deleteFromDetailBtn').addEventListener('click', () => {
        if (currentProduct) {
            deleteProductId = currentProduct.id;
            openModal('deleteModal');
        }
    });
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        if (deleteProductId) {
            deleteProduct(deleteProductId);
        }
    });
    
    // Tooltip for description
    document.addEventListener('mousemove', handleTooltipMove);
}

// ==================== SEARCH & FILTER ====================
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => 
            product.title.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    renderTable();
    renderPagination();
}

// ==================== SORTING ====================
function sortBy(column) {
    // Reset other column
    const otherColumn = column === 'title' ? 'price' : 'title';
    sortOrder[otherColumn] = 'none';
    document.getElementById(`sort${capitalize(otherColumn)}`).className = 'bi bi-arrow-down-up sort-btn';
    
    // Toggle current column
    if (sortOrder[column] === 'none' || sortOrder[column] === 'desc') {
        sortOrder[column] = 'asc';
    } else {
        sortOrder[column] = 'desc';
    }
    
    // Sort
    filteredProducts.sort((a, b) => {
        let valA = column === 'price' ? a[column] : a[column].toLowerCase();
        let valB = column === 'price' ? b[column] : b[column].toLowerCase();
        
        if (sortOrder[column] === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });
    
    // Update icon
    const icon = document.getElementById(`sort${capitalize(column)}`);
    icon.className = sortOrder[column] === 'asc' 
        ? 'bi bi-arrow-up sort-btn active' 
        : 'bi bi-arrow-down sort-btn active';
    
    renderTable();
}

// ==================== PAGINATION ====================
function handleItemsPerPageChange(e) {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
    renderPagination();
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
        renderPagination();
    }
}

// ==================== RENDER FUNCTIONS ====================
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(start, end);
    
    const tableBody = document.getElementById('productTable');
    const emptyState = document.getElementById('emptyState');
    
    if (paginatedProducts.length === 0) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    
    tableBody.innerHTML = paginatedProducts.map(product => {
        const categoryName = product.category?.name || 'N/A';
        const imageUrl = getProductImage(product);
        const description = product.description || 'Không có mô tả';
        
        return `
            <tr data-id="${product.id}" data-description="${escapeHtml(description)}">
                <td>
                    <span class="badge bg-light text-dark">#${product.id}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <img src="${imageUrl}" class="product-img" alt="${escapeHtml(product.title)}" 
                             onerror="this.src='https://via.placeholder.com/55?text=No+Image'">
                        <div>
                            <div class="product-title">${escapeHtml(product.title)}</div>
                            <div class="product-id">ID: ${product.id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="price-badge">$${product.price}</span>
                </td>
                <td>
                    <span class="category-badge">${escapeHtml(categoryName)}</span>
                </td>
                <td>
                    <img src="${imageUrl}" class="product-img" alt="thumbnail" 
                         onerror="this.src='https://via.placeholder.com/55?text=No+Image'"
                         style="width: 45px; height: 45px;">
                </td>
                <td>
                    <div class="action-btns justify-content-center">
                        <button class="btn-action view" onclick="viewProduct(${product.id})" title="Xem chi tiết">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn-action edit" onclick="editProductById(${product.id})" title="Chỉnh sửa">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action delete" onclick="confirmDelete(${product.id})" title="Xóa">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('totalItems').textContent = filteredProducts.length;
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    pagination.innerHTML = html;
}

function updateStats() {
    document.getElementById('statTotal').textContent = allProducts.length;
    
    // Count unique categories
    const categories = new Set(allProducts.map(p => p.category?.id).filter(Boolean));
    document.getElementById('statCategories').textContent = categories.size;
    
    // Calculate average price & total value
    if (allProducts.length > 0) {
        const totalValue = allProducts.reduce((sum, p) => sum + (p.price || 0), 0);
        const avgPrice = totalValue / allProducts.length;
        
        // Format numbers
        document.getElementById('statAvgPrice').textContent = formatNumber(avgPrice);
        document.getElementById('statTotalValue').textContent = formatNumber(totalValue);
    }
}

// Format số lớn cho gọn: 1000 -> 1K, 1000000 -> 1M
function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toFixed(0);
}

// ==================== MODAL FUNCTIONS ====================
function viewProduct(id) {
    const product = filteredProducts.find(p => p.id === id);
    if (!product) return;
    
    currentProduct = product;
    
    // Set main image
    const mainImage = document.getElementById('detailMainImage');
    mainImage.src = getProductImage(product);
    mainImage.onerror = () => mainImage.src = 'https://via.placeholder.com/400?text=No+Image';
    
    // Set thumbnails
    const thumbnails = document.getElementById('detailThumbnails');
    if (Array.isArray(product.images) && product.images.length > 0) {
        thumbnails.innerHTML = product.images.map((img, index) => `
            <img src="${cleanImageUrl(img)}" class="detail-thumb ${index === 0 ? 'active' : ''}" 
                 onclick="changeMainImage(this, '${cleanImageUrl(img)}')"
                 onerror="this.style.display='none'">
        `).join('');
    } else {
        thumbnails.innerHTML = '';
    }
    
    // Set details
    document.getElementById('detailTitle').textContent = product.title;
    document.getElementById('detailId').textContent = product.id;
    document.getElementById('detailPrice').textContent = '$' + product.price;
    document.getElementById('detailCategory').textContent = product.category?.name || 'N/A';
    document.getElementById('detailCategoryId').textContent = product.category?.id || 'N/A';
    document.getElementById('detailDescription').textContent = product.description || 'Không có mô tả';
    
    openModal('detailModal');
}

function changeMainImage(thumb, imageUrl) {
    document.getElementById('detailMainImage').src = imageUrl;
    document.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

function openCreateModal() {
    document.getElementById('createForm').reset();
    document.getElementById('createCategoryId').value = '1';
    openModal('createModal');
}

function openEditModal() {
    if (!currentProduct) return;
    
    document.getElementById('editId').value = currentProduct.id;
    document.getElementById('editTitle').value = currentProduct.title;
    document.getElementById('editPrice').value = currentProduct.price;
    document.getElementById('editDescription').value = currentProduct.description || '';
    document.getElementById('editCategoryId').value = currentProduct.category?.id || 1;
    
    const imagesString = Array.isArray(currentProduct.images) 
        ? currentProduct.images.join(', ') 
        : '';
    document.getElementById('editImages').value = imagesString;
    
    closeModal('detailModal');
    openModal('editModal');
}

function editProductById(id) {
    const product = filteredProducts.find(p => p.id === id);
    if (product) {
        currentProduct = product;
        openEditModal();
    }
}

function confirmDelete(id) {
    deleteProductId = id;
    openModal('deleteModal');
}

// ==================== FORM HANDLERS ====================
async function handleCreate() {
    const form = document.getElementById('createForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const imagesString = document.getElementById('createImages').value;
    const images = imagesString.split(',').map(img => img.trim()).filter(img => img);
    
    const data = {
        title: document.getElementById('createTitle').value,
        price: parseFloat(document.getElementById('createPrice').value),
        description: document.getElementById('createDescription').value,
        categoryId: parseInt(document.getElementById('createCategoryId').value),
        images: images
    };
    
    await createProduct(data);
}

async function handleEdit() {
    const form = document.getElementById('editForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const id = parseInt(document.getElementById('editId').value);
    const imagesString = document.getElementById('editImages').value;
    const images = imagesString.split(',').map(img => img.trim()).filter(img => img);
    
    const data = {
        title: document.getElementById('editTitle').value,
        price: parseFloat(document.getElementById('editPrice').value),
        description: document.getElementById('editDescription').value,
        categoryId: parseInt(document.getElementById('editCategoryId').value),
        images: images
    };
    
    await updateProduct(id, data);
}

// ==================== EXPORT CSV ====================
function exportToCSV() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const dataToExport = filteredProducts.slice(start, end);
    
    if (dataToExport.length === 0) {
        showToast('Cảnh báo', 'Không có dữ liệu để export', 'warning');
        return;
    }
    
    // BOM for UTF-8
    let csv = '\uFEFF';
    
    // Header
    csv += 'ID,Title,Price,Category,Description,Images\n';
    
    // Data
    dataToExport.forEach(product => {
        const title = escapeCSV(product.title);
        const categoryName = escapeCSV(product.category?.name || 'N/A');
        const description = escapeCSV(product.description || '');
        const images = Array.isArray(product.images) ? product.images.join('; ') : '';
        
        csv += `${product.id},"${title}",${product.price},"${categoryName}","${description}","${images}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `products_page_${currentPage}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Thành công', `Đã export ${dataToExport.length} sản phẩm`, 'success');
}

// ==================== TOOLTIP ====================
function handleTooltipMove(e) {
    const tooltip = document.getElementById('descriptionTooltip');
    const row = e.target.closest('tr[data-description]');
    
    if (row) {
        const description = row.getAttribute('data-description');
        tooltip.textContent = description;
        tooltip.style.left = (e.pageX + 15) + 'px';
        tooltip.style.top = (e.pageY + 15) + 'px';
        tooltip.classList.add('show');
    } else {
        tooltip.classList.remove('show');
    }
}

// ==================== UTILITY FUNCTIONS ====================
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(title, message, type = 'success') {
    const toast = document.getElementById('notificationToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    const iconClasses = {
        success: 'bi bi-check-circle-fill text-success me-2',
        error: 'bi bi-x-circle-fill text-danger me-2',
        warning: 'bi bi-exclamation-circle-fill text-warning me-2'
    };
    toastIcon.className = iconClasses[type] || iconClasses.success;
    
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
}

function openModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

function closeModal(modalId) {
    const modalElement = document.getElementById(modalId);
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
}

function getProductImage(product) {
    if (Array.isArray(product.images) && product.images.length > 0) {
        return cleanImageUrl(product.images[0]);
    }
    return 'https://via.placeholder.com/55?text=No+Image';
}

function cleanImageUrl(url) {
    if (!url) return 'https://via.placeholder.com/55?text=No+Image';
    // Remove extra quotes and brackets
    return url.replace(/[\[\]"]/g, '').trim();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeCSV(text) {
    if (!text) return '';
    return text.replace(/"/g, '""');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}