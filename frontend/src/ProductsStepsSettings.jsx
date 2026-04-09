import React, { useState, useEffect } from 'react';
import { getCsrfToken } from './csrfUtils.js';

const ProductsStepsSettings = () => {
  const [products, setProducts] = useState([]);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editingSteps, setEditingSteps] = useState(null);
  const [stepEdits, setStepEdits] = useState({});
  const [newStepsToAdd, setNewStepsToAdd] = useState({}); // Track new steps: { productId: [{ name, tempId }, ...] }
  const [showAddStepModal, setShowAddStepModal] = useState(null);
  const [newStepName, setNewStepName] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Pagination and search
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/app/settings/products-with-steps/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data = await response.json();
      // Filter out products with 0 steps
      const productsWithSteps = Array.isArray(data) ? data.filter(p => p.process_count > 0) : [];
      setProducts(productsWithSteps);
      setCurrentPage(1);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products and steps');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginate filtered results
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 2800);
  };

  const toggleProductExpand = (productId) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
    setEditingProduct(null);
  };

  const handleEditStart = (product) => {
    // Check if product has active tasks
    if (!product.can_edit) {
      showToast('Cannot edit this product. It has active tasks in progress.', 'error');
      return;
    }
    setEditingProduct(product.id);
    setEditName(product.product_name);
    setEditingSteps(null);
  };

  const handleEditStepsStart = (product) => {
    // Check if product has active tasks
    if (!product.can_edit) {
      showToast('Cannot edit steps for this product. It has active tasks in progress.', 'error');
      return;
    }
    setEditingSteps(product.id);
    const stepsMap = {};
    product.processes.forEach((proc) => {
      stepsMap[proc.id] = proc.process_name;
    });
    setStepEdits(stepsMap);
  };

  const handleStepNameChange = (stepId, newName) => {
    setStepEdits({ ...stepEdits, [stepId]: newName });
  };

  const handleEditStepsSave = async (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    for (const stepId in stepEdits) {
      if (!stepEdits[stepId].trim()) {
        showToast('Step name cannot be empty', 'error');
        return;
      }
    }

    // Check if new steps exist and are not empty
    const productNewSteps = newStepsToAdd[productId] || [];
    if (productNewSteps.some(s => !s.name.trim())) {
      showToast('New step names cannot be empty', 'error');
      return;
    }

    try {
      // Prepare steps to update (existing steps with edited names)
      const stepsToUpdate = product.processes.map((proc) => ({
        id: proc.id,
        process_name: stepEdits[proc.id] || proc.process_name,
      }));

      // Prepare new steps to add
      const stepsToAddForBackend = productNewSteps.map(s => ({
        step_name: s.name.trim()
      }));

      const response = await fetch('/app/settings/products-with-steps/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          product_id: productId,
          steps: stepsToUpdate,
          new_steps: stepsToAddForBackend,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update steps: ${response.statusText}`);
      }

      // Fetch fresh data to reload steps
      await fetchProducts();
      setEditingSteps(null);
      setStepEdits({});
      setNewStepsToAdd({});
      showToast('Steps saved successfully', 'success');
    } catch (err) {
      console.error('Error updating steps:', err);
      showToast('Failed to save steps', 'error');
    }
  };

  const handleEditCancel = () => {
    setEditingProduct(null);
    setEditName('');
    setEditingSteps(null);
    setStepEdits({});
    setShowAddStepModal(null);
    setNewStepName('');
    setNewStepsToAdd({});
  };

  const handleAddStepClick = (productId) => {
    setShowAddStepModal(productId);
    setNewStepName('');
  };

  const handleAddStep = (productId) => {
    if (!newStepName.trim()) {
      showToast('Please enter a step name', 'error');
      return;
    }

    // Add to local state - will be saved with Save Steps button
    const newSteps = newStepsToAdd[productId] || [];
    const tempId = `new_${Date.now()}`;
    setNewStepsToAdd({
      ...newStepsToAdd,
      [productId]: [...newSteps, { name: newStepName.trim(), tempId }]
    });

    setNewStepName('');
    setShowAddStepModal(null);
    showToast('Step added to form. Click Save Steps to save.', 'success');
  };

  const handleRemoveStep = async (productId, templateId) => {
    if (!confirm('Are you sure you want to remove this step? Remaining steps will be reordered.')) {
      return;
    }

    try {
      const response = await fetch('/app/settings/products-with-steps/remove-step/', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          product_id: productId,
          template_id: templateId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to remove step: ${response.statusText}`);
      }

      // Update local state by fetching fresh product data
      await fetchProducts();
      showToast('Step removed successfully', 'success');
    } catch (err) {
      console.error('Error removing step:', err);
      showToast(`Failed to remove step: ${err.message}`, 'error');
    }
  };

  const handleEditSave = async (productId) => {
    if (!editName.trim()) {
      showToast('Product name cannot be empty', 'error');
      return;
    }

    try {
      const response = await fetch('/app/settings/products-with-steps/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          product_id: productId,
          product_name: editName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update product: ${response.statusText}`);
      }

      // Update local state
      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, product_name: editName.trim() } : p
        )
      );
      setEditingProduct(null);
      setEditName('');
      showToast('Product name updated successfully', 'success');
    } catch (err) {
      console.error('Error updating product:', err);
      showToast('Failed to update product name', 'error');
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading products and steps...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <p>{error}</p>
        <button onClick={fetchProducts} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>No products configured yet</p>
      </div>
    );
  }

  return (
    <div className="products-steps-container">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ marginTop: 0 }}>Products & Manufacturing Steps</h2>
        <p style={{ color: '#666' }}>
          Manage product definitions and their configured manufacturing process steps.
        </p>
      </div>

      {/* Search Section */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search products by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
        {searchQuery && (
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Found {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}
      </div>

      {/* Results info */}
      <div style={{ marginBottom: '15px', fontSize: '12px', color: '#666' }}>
        Showing {paginatedProducts.length === 0 && filteredProducts.length === 0 ? 0 : startIndex + 1}-
        {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} product
        {filteredProducts.length !== 1 ? 's' : ''} {searchQuery && `(filtered from ${products.length} total)`}
      </div>

      {/* Empty search result */}
      {filteredProducts.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <p>No products match your search</p>
        </div>
      )}

      {/* Products Accordion */}
      {paginatedProducts.length > 0 && (
        <div className="products-accordion">
          {paginatedProducts.map((product) => (
            <div key={product.id} className="accordion-item">
              <div
                className={`accordion-header ${expandedProduct === product.id ? 'open' : ''}`}
                onClick={() => toggleProductExpand(product.id)}
              >
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>
                    {product.product_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {product.process_count} step{product.process_count !== 1 ? 's' : ''}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#999', marginRight: '10px' }}>
                  {expandedProduct === product.id ? '▼' : '▶'}
                </span>
              </div>

              <div className={`accordion-content ${expandedProduct === product.id ? 'open' : ''}`}>
                {editingProduct === product.id ? (
                  <div style={{ padding: '15px', borderTop: '1px solid #e0e0e0' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEditSave(product.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleEditCancel}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid #e0e0e0' }}>
                    {editingSteps === product.id ? (
                      <div style={{ padding: '15px' }}>
                        <div style={{ marginBottom: '15px' }}>
                          <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px' }}>Edit Step Names</h4>
                          {product.processes.map((process) => (
                            <div key={process.id} style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <div style={{ flexGrow: 1 }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>
                                  Step {process.step_order}
                                </label>
                                <input
                                  type="text"
                                  value={stepEdits[process.id] || ''}
                                  onChange={(e) => handleStepNameChange(process.id, e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => handleRemoveStep(product.id, process.id)}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#f44336',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  marginTop: '20px',
                                  whiteSpace: 'nowrap',
                                }}
                                title="Remove this step"
                              >
                                Remove
                              </button>
                            </div>
                          ))}

                          {(newStepsToAdd[product.id] || []).map((newStep) => (
                            <div key={newStep.tempId} style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start', border: '1px solid #81c784' }}>
                              <div style={{ flexGrow: 1 }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px', color: '#2e7d32' }}>
                                  New Step (pending save)
                                </label>
                                <input
                                  type="text"
                                  value={newStep.name}
                                  onChange={(e) => {
                                    const updatedSteps = (newStepsToAdd[product.id] || []).map(s =>
                                      s.tempId === newStep.tempId ? { ...s, name: e.target.value } : s
                                    );
                                    setNewStepsToAdd({
                                      ...newStepsToAdd,
                                      [product.id]: updatedSteps
                                    });
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #81c784',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const updatedSteps = (newStepsToAdd[product.id] || []).filter(s => s.tempId !== newStep.tempId);
                                  if (updatedSteps.length === 0) {
                                    const newState = { ...newStepsToAdd };
                                    delete newState[product.id];
                                    setNewStepsToAdd(newState);
                                  } else {
                                    setNewStepsToAdd({
                                      ...newStepsToAdd,
                                      [product.id]: updatedSteps
                                    });
                                  }
                                }}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#f44336',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  marginTop: '20px',
                                  whiteSpace: 'nowrap',
                                }}
                                title="Remove this step"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>

                        {showAddStepModal === product.id && (
                          <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px', border: '1px solid #ddd' }}>
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
                                Enter new step name
                              </label>
                              <input
                                type="text"
                                value={newStepName}
                                onChange={(e) => setNewStepName(e.target.value)}
                                placeholder="e.g., Assembly, Testing, Packaging..."
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                  boxSizing: 'border-box',
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddStep(product.id);
                                  }
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleAddStep(product.id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#4CAF50',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                }}
                              >
                                Add
                              </button>
                              <button
                                onClick={() => {
                                  setShowAddStepModal(null);
                                  setNewStepName('');
                                }}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#999',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                          {showAddStepModal !== product.id && (
                            <button
                              onClick={() => handleAddStepClick(product.id)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#8BC34A',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                              }}
                            >
                              Add Step
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEditStepsSave(product.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            Save Steps
                          </button>
                          <button
                            onClick={() => {
                              setEditingSteps(null);
                              setStepEdits({});
                              setShowAddStepModal(null);
                              setNewStepName('');
                              setNewStepsToAdd({});
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : product.process_count > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f5f5f5' }}>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid #ddd' }}>
                              Step
                            </th>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid #ddd' }}>
                              Process Name
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.processes.map((process) => (
                            <tr key={process.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '10px', fontSize: '13px' }}>{process.step_order}</td>
                              <td style={{ padding: '10px', fontSize: '13px' }}>{process.process_name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: '15px', fontSize: '13px', color: '#999' }}>
                        No process steps configured for this product
                      </div>
                    )}

                    {editingSteps !== product.id && (
                      <div
                        style={{
                          padding: '10px 15px',
                          borderTop: '1px solid #eee',
                          display: 'flex',
                          gap: '8px',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          onClick={() => handleEditStart(product)}
                          disabled={!product.can_edit}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: product.can_edit ? '#2196F3' : '#cccccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: product.can_edit ? 'pointer' : 'not-allowed',
                            fontSize: '12px',
                          }}
                          title={!product.can_edit ? 'Cannot edit: Product has active tasks' : 'Edit product name'}
                        >
                          Edit Product
                        </button>
                        {product.process_count > 0 && (
                          <button
                            onClick={() => handleEditStepsStart(product)}
                            disabled={!product.can_edit}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: product.can_edit ? '#FF9800' : '#cccccc',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: product.can_edit ? 'pointer' : 'not-allowed',
                              fontSize: '12px',
                            }}
                            title={!product.can_edit ? 'Cannot edit: Product has active tasks' : 'Edit step names'}
                          >
                            Edit Steps
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
        }}>
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              backgroundColor: currentPage === 1 ? '#ddd' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px',
              backgroundColor: currentPage === totalPages ? '#ddd' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            Next →
          </button>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
        <p style={{ marginTop: 0 }}>
          <strong>Info:</strong> This section displays all configured products and their manufacturing process steps. 
          Use the search box to filter products, or navigate through pages to view all items. Use the Edit button to update product names. Changes are logged for audit purposes.
        </p>
      </div>

      {toast.show && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 11000,
            minWidth: '300px',
            maxWidth: '420px',
            background: toast.type === 'success' 
              ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.98) 0%, rgba(6, 95, 70, 0.98) 100%)' 
              : 'linear-gradient(135deg, rgba(220, 38, 38, 0.98) 0%, rgba(153, 27, 27, 0.98) 100%)',
            color: toast.type === 'success' ? '#ecfdf5' : '#fee2e2',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            boxShadow: toast.type === 'success' 
              ? '0 14px 30px rgba(5, 150, 105, 0.35)' 
              : '0 14px 30px rgba(220, 38, 38, 0.35)',
            border: toast.type === 'success' 
              ? '1px solid rgba(167, 243, 208, 0.4)' 
              : '1px solid rgba(248, 113, 113, 0.4)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          {toast.type === 'success' ? (
            <span style={{ fontSize: '16px' }}>✓</span>
          ) : (
            <span style={{ fontSize: '16px' }}>⚠</span>
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default ProductsStepsSettings;
